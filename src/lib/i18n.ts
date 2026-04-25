import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      "dashboard": "Dashboard",
      "farm": "Farm",
      "shop": "Shop",
      "inventory": "Inventory",
      "accounts": "Accounts",
      "customers": "Customers",
      "orders": "Orders",
      "settings": "Settings",
      "logout": "Logout",
      "total_birds": "Total Birds",
      "total_sales": "Total Sales",
      "profit": "Profit",
      "stock": "Stock",
      "add_batch": "Add New Batch",
      "mortality": "Mortality",
      "feed": "Feed",
      "vaccination": "Vaccination",
      "weight": "Weight",
      "pos": "Point of Sale",
      "invoice": "Invoice",
      "customer_name": "Customer Name",
      "phone": "Phone",
      "item": "Item",
      "quantity": "Quantity",
      "price": "Price",
      "total": "Total",
      "complete_sale": "Complete Sale",
      "udhaar": "Udhaar (Credit)",
      "hindi": "Hindi",
      "english": "English",
      "select_product": "Select Product",
      "add": "Add",
      "total_amount": "Total Amount",
      "search": "Search",
      "insufficient_stock": "Only {{count}} {{unit}} available in stock!"
    }
  },
  hi: {
    translation: {
      "dashboard": "डैशबोर्ड",
      "farm": "फार्म",
      "shop": "दुकान",
      "inventory": "इन्वेंटरी",
      "accounts": "खाते",
      "customers": "ग्राहक",
      "orders": "ऑर्डर",
      "settings": "सेटिंग्स",
      "logout": "लॉगआउट",
      "total_birds": "कुल पक्षी",
      "total_sales": "कुल बिक्री",
      "profit": "लाभ",
      "stock": "स्टॉक",
      "add_batch": "नया बैच जोड़ें",
      "mortality": "मृत्यु दर",
      "feed": "चारा",
      "vaccination": "टीकाकरण",
      "weight": "वजन",
      "pos": "बिक्री केंद्र",
      "invoice": "चालान",
      "customer_name": "ग्राहक का नाम",
      "phone": "फ़ोन",
      "item": "वस्तु",
      "quantity": "मात्रा",
      "price": "कीमत",
      "total": "कुल",
      "complete_sale": "बिक्री पूरी करें",
      "udhaar": "उधार",
      "hindi": "हिंदी",
      "english": "अंग्रेजी",
      "select_product": "उत्पाद चुनें",
      "add": "जोड़ें",
      "total_amount": "कुल राशि",
      "search": "खोजें",
      "insufficient_stock": "स्टॉक में केवल {{count}} {{unit}} उपलब्ध है!"
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "en",
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
