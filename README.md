# MyDormy - Studentų Bendrabučio Kambarių Rezervacijos Sistema

## 📋 Projekto aprašymas
MyDormy yra centralizuota sistema, skirta VGTU bendrabučių kambarių rezervacijai ir valdymui. Sistema automatizuoja visą apgyvendinimo procesą - nuo kambario paieškos iki sutarties pasirašymo.

## 🏗️ Projekto struktūra
```
MyDormy/
├── backend/          # Node.js + Express.js serveris
├── frontend/         # React aplikacija
├── database/         # PostgreSQL schemos ir migracijos
├── docs/            # Dokumentacija
└── README.md
```

## 🛠️ Technologijos

### Backend:
- Node.js 18+
- Express.js
- PostgreSQL 14+
- JWT autentifikacija
- Bcrypt slaptažodžių šifravimui

### Frontend:
- React 18+
- Material-UI
- React Router
- Axios
- Context API būsenų valdymui

## 📦 Diegimas

### 1. Klonuok repozitoriją
```bash
git clone https://github.com/NNTKLOne/MyDormy.git
cd MyDormy
```

### 2. Backend nustatymas
```bash
cd backend
npm install
cp .env.example .env
# Redaguok .env failą su savo duomenų bazės nustatymais
npm run migrate
npm run dev
```

### 3. Frontend nustatymas
```bash
cd frontend
npm install
npm start
```

## 🚀 Sparinti išvystymas

### Sprint 1: Pagrindinis funkcionalumas
- ✅ Prisijungimas ir autentifikacija
- ✅ Kambarių paieška su filtrais
- ✅ Kambario rezervacija
- ✅ Apžiūros laiko rezervavimas

### Sprint 2: Administravimas
- 🔄 Apgyvendinimo prašymų valdymas
- 🔄 Sutarčių pasirašymas
- 🔄 Prašymų tvirtinimas

### Sprint 3: Papildomas funkcionalumas
- ⏳ Kambarių valdymas
- ⏳ Pranešimų sistema
- ⏳ Gyventojų būsenų valdymas

## 👥 Komanda
- Vilius Ničiperovičius
- Augustas Česnavičius
- Dominik Lavcel

## 📝 Licencija
VGTU Kompleksinis projektas 2025

## 📞 Kontaktai
Projekto repozitorija: https://github.com/NNTKLOne/MyDormy
