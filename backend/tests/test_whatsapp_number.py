import os
import unittest

from services.whatsapp_service import get_business_whatsapp_number


class WhatsAppNumberTests(unittest.TestCase):
    def test_business_whatsapp_number_defaults_to_new_contact(self):
        os.environ.pop("WHATSAPP_BUSINESS_NUMBER", None)

        self.assertEqual(
            get_business_whatsapp_number(),
            "2348075344214"
        )


if __name__ == "__main__":
    unittest.main()
