# Alpha E-Commerce

A full-stack e-commerce platform built with Next.js and Django, featuring a comprehensive admin dashboard, user authentication, and product management.

## 🚀 Key Features

*   **Modern Storefront**: Built with **Next.js**, Tailwind CSS, and Shadcn UI for a fast, responsive shopping experience.
*   **Powerful Backend**: Powered by **Django REST Framework** for robust API management.
*   **Admin Dashboard**:
    *   **Analytics**: Real-time charts for Revenue, Orders, and Visitor stats (Monthly/Yearly filters).
    *   **Management**: Full control over Products, Orders, Bookings, and Users.
    *   **Newsletter**: View compliance-ready subscriber lists.
*   **Smart Features**:
    *   **Site Tracking**: Intelligent session-based visitor tracking (Device type, Country/City).
    *   **Authentication**: Secure user login/signup with role-based access (Admin/User).
    *   **Cart & Checkout**: Seamless shopping cart and order processing flow.

## 🛠 Tech Stack

*   **Frontend**: Next.js 14 (App Router), TypeScript, Redux Toolkit, Tailwind CSS.
*   **Backend**: Python, Django, Django REST Framework, SQLite (dev).
*   **Tools**: Recharts (Analytics), Lucide React (Icons), date-fns.

## 📦 Getting Started

### Backend
```bash
cd server
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Frontend
```bash
cd client
npm install
npm run dev
```

Visit `http://localhost:3000` for the store and `http://localhost:3000/dashboard` for the admin panel.
