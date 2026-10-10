import os
import sys

sys.path.insert(
	0,
	os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
)

from app import app
from extensions import db
from models.category import Category


DEFAULT_CATEGORIES = [
	{
		"name": "Shoes",
		"slug": "shoes",
		"description": "Shoes and footwear."
	},
	{
		"name": "Other Outfit",
		"slug": "other-outfit",
		"description": "Other clothing and outfit items."
	}
]


with app.app_context():
	for category_data in DEFAULT_CATEGORIES:
		existing_category = Category.query.filter(
			db.or_(
				db.func.lower(Category.name) == category_data["name"].lower(),
				db.func.lower(Category.slug) == category_data["slug"].lower()
			)
		).first()

		if existing_category:
			continue

		db.session.add(Category(**category_data))

	db.session.commit()
