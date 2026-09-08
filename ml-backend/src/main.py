import pandas as pd
import argparse
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from generate_data import generate_soc_efficiency_data, prepare_training_data
from models import SOCEfficiencyRegressor, train_efficiency_model, evaluate_model
from outputs import run_full_evaluation_pipeline, export_to_csv

def train_and_save_model(output_dir: str = "models", model_type: str = "ensemble"):
    os.makedirs(output_dir, exist_ok=True)
    
    print("Generating training data...")
    df = pd.DataFrame(list(generate_soc_efficiency_data(200, 6)))
    df.to_csv(os.path.join(output_dir, 'training_data.csv'), index=False)
    print(f"Training data: {len(df)} samples")
    
    print(f"\nTraining {model_type} model...")
    model = SOCEfficiencyRegressor(model_type=model_type)
    stats = model.train(df)
    
    print(f"\nTraining Results:")
    for target, metrics in stats['metrics'].items():
        print(f"  {target}: R²={metrics['r2']:.3f}, RMSE={metrics['rmse']:.3f}, MAE={metrics['mae']:.3f}")
    
    model.save(os.path.join(output_dir, 'soc_efficiency_model.pkl'))
    print(f"\nModels saved to {output_dir}/")
    
    return model, df


def run_inference(model: SOCEfficiencyRegressor, input_csv: str, output_dir: str):
    os.makedirs(output_dir, exist_ok=True)
    
    print(f"\nLoading inference data from {input_csv}...")
    df = pd.read_csv(input_csv)
    print(f"Inference samples: {len(df)}")
    
    if 'entity_id' not in df.columns or 'period' not in df.columns:
        raise ValueError("Input CSV must contain 'entity_id' and 'period' columns")
    
    # Ensure all features present
    from features import SOC_FEATURES
    for f in SOC_FEATURES:
        if f not in df.columns:
            df[f] = 0
    
    print("Running efficiency evaluation...")
    model_path = os.path.join(output_dir, 'soc_efficiency_model.pkl')
    
    # Load model if not already loaded
    if not model.is_trained:
        model.load(model_path)
    
    # Run evaluation pipeline
    from outputs import run_full_evaluation_pipeline, export_to_csv
    from models import SOCEfficiencyEvaluator
    
    evaluator = SOCEfficiencyEvaluator()
    evaluator.model = model
    
    results = []
    for _, row in df.iterrows():
        row_df = pd.DataFrame([row])
        eval_result = evaluator.evaluate(row_df)
        results.append({
            'entity_id': row.get('entity_id', 'Unknown'),
            'period': row.get('period', 'Unknown'),
            'sector': row.get('sector', 'Unknown'),
            'criticality': row.get('criticality', 'Unknown'),
            'ml_predictions': evaluator.model.predict_with_confidence(pd.DataFrame([row.to_dict()])),
            'rule_findings': evaluator.rules_engine.analyze(pd.DataFrame([row.to_dict()])),
            'overall': evaluator.model.predict_with_confidence(pd.DataFrame([row.to_dict()]))
        })
    
    # Generate outputs
    entities_df = df[['entity_id', 'period', 'sector', 'criticality']].copy()
    from outputs import generate_file_a_efficiency, generate_file_b_recommendations, export_to_csv
    
    all_findings = []
    for _, row in df.iterrows():
        row_df = pd.DataFrame([row])
        eval_result = evaluator.evaluate(row_df)
        all_findings.extend(eval_result.get('rule_findings', []))
    
    ml_preds = [evaluator.model.predict_with_confidence(pd.DataFrame([row.to_dict()])) for _, row in df.iterrows()]
    
    file_a = generate_file_a_efficiency(df, [evaluator.model.predict_with_confidence(pd.DataFrame([row.to_dict()])) for _, row in df.iterrows()], all_findings)
    file_b = generate_file_b_recommendations(df, [evaluator.model.predict_with_confidence(pd.DataFrame([row.to_dict()])) for _, row in df.iterrows()], all_findings)
    
    file_a_path = os.path.join(output_dir, 'file_a_efficiency_report.csv')
    file_b_path = os.path.join(output_dir, 'file_b_recommendations.csv')
    
    file_a.to_csv(file_a_path, index=False)
    file_b.to_csv(file_b_path, index=False)
    
    print(f"\nResults saved:")
    print(f"  File A (Efficiency Report): {file_a_path}")
    print(f"  File B (Recommendations): {file_b_path}")
    
    # Summary - compute risk score from ML predictions
    def calc_risk_score(ml_pred_list):
        risk = 0
        for pred in ml_pred_list:
            for target, pred_data in pred.items():
                if isinstance(pred_data, dict):
                    val = pred_data.get('prediction', 0)
                else:
                    val = pred_data
                # Higher = worse for most metrics except analyst_efficiency
                if target == 'analyst_efficiency':
                    risk += max(0, 1 - min(val / 5, 1))
                else:
                    risk += min(val * 2, 1)
        return risk / max(1, len(ml_pred_list) * 6)
    
    attacks = sum(1 for r in results if calc_risk_score(r['overall']) > 0.7)
    print(f"\nSummary:")
    print(f"  Total entities evaluated: {len(results)}")
    print(f"  High risk entities: {attacks}")
    print(f"  Rule findings generated: {sum(len(r['rule_findings']) for r in results)}")
    
    return file_a, file_b


def main():
    parser = argparse.ArgumentParser(description='SAT-SA ML Backend - SOC Efficiency Evaluation')
    parser.add_argument('--mode', choices=['train', 'infer', 'full'], default='full', help='Operation mode')
    parser.add_argument('--model-type', choices=['rf', 'gbr', 'ensemble'], default='ensemble', help='Model type')
    parser.add_argument('--n-entities', type=int, default=200, help='Number of entities for synthetic data')
    parser.add_argument('--periods-per-entity', type=int, default=6, help='Periods per entity')
    parser.add_argument('--input-csv', type=str, help='Input CSV for inference')
    parser.add_argument('--output-dir', type=str, default='output', help='Output directory')
    parser.add_argument('--model-dir', type=str, default='models', help='Model directory')
    
    args = parser.parse_args()
    
    if args.mode in ['train', 'full']:
        train_and_save_model(args.model_dir, args.model_type)
    
    if args.mode in ['infer', 'full']:
        if args.input_csv:
            infer_df = pd.read_csv(args.input_csv)
        else:
            print(f"\nGenerating {args.n_entities} inference samples...")
            import pandas as pd
            from generate_data import generate_soc_efficiency_data
            infer_df = pd.DataFrame(list(generate_soc_efficiency_data(args.n_entities, args.periods_per_entity))).drop(columns=[t for t in ['false_positive_rate', 'incorrect_classification_ratio', 'analyst_efficiency', 'insufficient_evidence_ratio', 'signature_age_days', 'playbook_gap_ratio']])
            infer_df.to_csv(os.path.join(args.output_dir, 'inference_data.csv'), index=False)
        
        model = SOCEfficiencyRegressor()
        model.load(os.path.join(args.model_dir, 'soc_efficiency_model.pkl'))
        run_inference(model, args.input_csv or os.path.join(args.output_dir, 'inference_data.csv'), args.output_dir)


if __name__ == "__main__":
    main()