import io
import unittest
from unittest.mock import patch

from starlette.datastructures import UploadFile

from src.api import BatchEfficiencyInput, SOCEntityInput, evaluate_csv, evaluate_efficiency


class MissingFeatureAbstentionTests(unittest.IsolatedAsyncioTestCase):
    async def test_json_evaluation_abstains_when_model_and_features_are_unavailable(self):
        request = BatchEfficiencyInput(entities=[
            SOCEntityInput(entity_id="CSE-001", period="Q2 FY 2026-27", features={})
        ])

        with patch("src.api.evaluator", None):
            results = await evaluate_efficiency(request)

        result = results[0]
        self.assertEqual(result.overall_assessment["status"], "insufficient_feature_coverage")
        self.assertEqual(result.feature_coverage["provided"], 0)
        self.assertEqual(result.feature_coverage["status"], "insufficient")
        self.assertTrue(result.missing_features)
        self.assertTrue(all(score["score"] is None for score in result.efficiency_scores.values()))

    async def test_csv_evaluation_abstains_when_model_and_features_are_unavailable(self):
        upload = UploadFile(
            filename="incomplete.csv",
            file=io.BytesIO(b"entity_id,period\nCSE-001,Q2 FY 2026-27\n")
        )

        with patch("src.api.evaluator", None):
            response = await evaluate_csv(upload)

        result = response["results"][0]
        self.assertEqual(result["overall_assessment"]["status"], "insufficient_feature_coverage")
        self.assertEqual(result["feature_coverage"]["provided"], 0)
        self.assertTrue(result["missing_features"])
        self.assertTrue(all(score["score"] is None for score in result["efficiency_scores"].values()))


if __name__ == "__main__":
    unittest.main()
