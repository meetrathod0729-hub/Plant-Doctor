
import csv
import random
import sys
from pathlib import Path

# Project paths
PROJECT_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = PROJECT_ROOT / "Backend"
TEST_DIR = PROJECT_ROOT / "PlantDoc-Dataset-master" / "PlantDoc-Dataset-master" / "test"
OUTPUT_FILE = PROJECT_ROOT / "evaluation" / "plantdoc_results.csv"

# Import the existing Ollama provider
sys.path.insert(0, str(BACKEND_DIR))

from providers.ollama_provider import diagnose_plant


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
SAMPLES_PER_CLASS = 1
RANDOM_SEED = 42


def expected_health(class_name: str):
    """
    Map PlantDoc test folder labels to broad health categories.

    Returns None when the class name is ambiguous.
    Review mappings before using results as an accuracy claim.
    """
    label = class_name.lower()

    healthy_names = {
        "apple leaf",
        "bell_pepper leaf",
        "blueberry leaf",
        "cherry leaf",
        "grape leaf",
        "peach leaf",
        "raspberry leaf",
        "soyabean leaf",
        "strawberry leaf",
        "tomato leaf",
    }

    if label in healthy_names:
        return "Healthy"

    disease_terms = (
        "scab",
        "rust",
        "spot",
        "blight",
        "rot",
        "mildew",
        "virus",
        "mold",
        "mould",
        "bacterial",
    )

    if any(term in label for term in disease_terms):
        return "Needs attention"

    return None


def main():
    if not TEST_DIR.exists():
        raise FileNotFoundError(
            f"Test directory not found: {TEST_DIR}"
        )

    random.seed(RANDOM_SEED)
    rows = []

    class_dirs = sorted(
        path for path in TEST_DIR.iterdir()
        if path.is_dir()
    )

    if not class_dirs:
        raise RuntimeError("No class folders found in PlantDoc test set.")

    for class_dir in class_dirs:
        expected = expected_health(class_dir.name)

        images = [
            path for path in class_dir.iterdir()
            if path.suffix.lower() in IMAGE_EXTENSIONS
        ]

        if expected is None:
            print(f"Skipping unmapped class: {class_dir.name}")
            continue

        random.shuffle(images)
        selected = images[:SAMPLES_PER_CLASS]

        for image_path in selected:
            print(f"Analyzing: {class_dir.name}/{image_path.name}")

            try:
                result = diagnose_plant(image_path.read_bytes())

                import json
                diagnosis = json.loads(result)

                predicted = diagnosis["health_status"]

                rows.append({
                    "image": str(image_path.relative_to(PROJECT_ROOT)),
                    "true_class": class_dir.name,
                    "expected_health": expected,
                    "predicted_plant": diagnosis["plant_name"],
                    "predicted_health": predicted,
                    "confidence": diagnosis["confidence"],
                    "likely_issue": diagnosis["likely_issue"],
                    "correct": predicted == expected,
                    "error": "",
                })

            except Exception as exc:
                print(f"  Error: {exc}")

                rows.append({
                    "image": str(image_path.relative_to(PROJECT_ROOT)),
                    "true_class": class_dir.name,
                    "expected_health": expected,
                    "predicted_plant": "",
                    "predicted_health": "",
                    "confidence": "",
                    "likely_issue": "",
                    "correct": False,
                    "error": str(exc),
                })

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

    columns = [
        "image",
        "true_class",
        "expected_health",
        "predicted_plant",
        "predicted_health",
        "confidence",
        "likely_issue",
        "correct",
        "error",
    ]

    with OUTPUT_FILE.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=columns)
        writer.writeheader()
        writer.writerows(rows)

    completed = [
        row for row in rows
        if row["predicted_health"]
    ]

    correct_count = sum(row["correct"] for row in completed)

    print("\nEvaluation finished.")
    print(f"Images processed: {len(rows)}")
    print(f"Successful predictions: {len(completed)}")
    print(f"Failed predictions: {len(rows) - len(completed)}")

    if completed:
        accuracy = correct_count / len(completed) * 100
        print(f"Broad health-category agreement: {accuracy:.2f}%")

    print(f"Results saved to: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
