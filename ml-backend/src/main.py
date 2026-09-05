import pandas as pd
import argparse
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from generate_data import generate_training_data, generate_inference_data
from models import EnsembleDetector
from outputs import run_full_pipeline, generate_file_a, generate_file_b

def train_and_save_model(output_dir: str = "models"):
    os.makedirs(output_dir, exist_ok=True)
    
    print("Generating training data...")
    df = generate_training_data(5000, 0.3)
    df.to_csv(os.path.join(output_dir, 'training_data.csv'), index=False)
    print(f"Training data: {len(df)} samples, {(df['label']==1).sum()} attacks, {(df['label']==0).sum()} normal")
    
    print("\nTraining ensemble model...")
    detector = EnsembleDetector()
    stats = detector.train(df)
    
    print(f"Supervised Accuracy: {stats['supervised']['accuracy']:.4f}")
    print(f"Unsupervised Clusters: {stats['unsupervised']['cluster_sizes']}")
    print(f"Cluster Labels: {stats['unsupervised']['cluster_labels']}")
    print(f"Inertia: {stats['unsupervised']['inertia']:.2f}")
    
    detector.save(
        os.path.join(output_dir, 'supervised_model.pkl'),
        os.path.join(output_dir, 'unsupervised_model.pkl')
    )
    print(f"\nModels saved to {output_dir}/")
    
    return detector, df

def run_inference(detector: EnsembleDetector, input_csv: str, output_dir: str, investigators: str = None):
    os.makedirs(output_dir, exist_ok=True)
    
    print(f"\nLoading inference data from {input_csv}...")
    df = pd.read_csv(input_csv)
    print(f"Inference samples: {len(df)}")
    
    if 'label' in df.columns:
        df = df.drop(columns=['label'])
    
    if 'ticket_number' not in df.columns:
        df['ticket_number'] = [f'TKT-{pd.Timestamp.now().strftime("%Y%m%d")}-{i+1:05d}' for i in range(len(df))]
    
    print("Running predictions...")
    results = detector.predict(df)
    
    inv_list = investigators.split(',') if investigators else None
    file_a = generate_file_a(df, results, inv_list)
    file_b = generate_file_b(df, results)
    
    file_a_path = os.path.join(output_dir, 'file_a_investigator_tickets.csv')
    file_b_path = os.path.join(output_dir, 'file_b_playbook_triggers.csv')
    
    file_a.to_csv(file_a_path, index=False)
    file_b.to_csv(file_b_path, index=False)
    
    print(f"\nResults saved:")
    print(f"  File A (Investigator tickets): {file_a_path}")
    print(f"  File B (Playbook triggers): {file_b_path}")
    
    attacks = sum(1 for r in results if r['classification'] == 'Attack')
    normal = sum(1 for r in results if r['classification'] == 'Normal')
    escalations = sum(1 for r in results if r['classification'] == 'Attack' and r['confidence'] >= 0.7)
    
    print(f"\nSummary:")
    print(f"  Total: {len(df)}")
    print(f"  Attack: {attacks}")
    print(f"  Normal: {normal}")
    print(f"  Escalations needed (conf>=0.7): {escalations}")
    
    return file_a, file_b

def main():
    parser = argparse.ArgumentParser(description='SAT-SA ML Backend - Attack Detection Pipeline')
    parser.add_argument('--mode', choices=['train', 'infer', 'full'], default='full', help='Operation mode')
    parser.add_argument('--train-samples', type=int, default=5000, help='Number of training samples')
    parser.add_argument('--infer-samples', type=int, default=100, help='Number of inference samples')
    parser.add_argument('--input-csv', type=str, help='Input CSV for inference')
    parser.add_argument('--output-dir', type=str, default='output', help='Output directory')
    parser.add_argument('--model-dir', type=str, default='models', help='Model directory')
    parser.add_argument('--investigators', type=str, help='Comma-separated investigator names')
    parser.add_argument('--attack-ratio', type=float, default=0.3, help='Attack ratio in training data')
    
    args = parser.parse_args()
    
    if args.mode in ['train', 'full']:
        detector, train_df = train_and_save_model(args.model_dir)
    else:
        detector = EnsembleDetector()
        detector.load(
            os.path.join(args.model_dir, 'supervised_model.pkl'),
            os.path.join(args.model_dir, 'unsupervised_model.pkl')
        )
    
    if args.mode in ['infer', 'full']:
        if args.input_csv:
            infer_df = pd.read_csv(args.input_csv)
        else:
            print(f"\nGenerating {args.infer_samples} inference samples...")
            infer_df = generate_inference_data(args.infer_samples)
            infer_df.to_csv(os.path.join(args.output_dir, 'inference_data.csv'), index=False)
        
        run_inference(detector, args.input_csv or os.path.join(args.output_dir, 'inference_data.csv'), 
                     args.output_dir, args.investigators)

if __name__ == "__main__":
    main()