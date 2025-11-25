# MyDormy

Šioje repozitorijoje saugomas **MyDormy** sistemos programinis kodas.

**MyDormy** - tai išmanioji studentų bendrabučių kambarių rezervavimo ir valdymo sistema, skirta palengvinti ir automatizuoti apgyvendinimo procesą universitetuose.  
Sistema centralizuoja studentų prašymus, kambarių rezervacijas, apžiūrų planavimą, sutarčių pasirašymą ir palengvina komunikaciją tarp administracijos, budėtojų, studentų bei esamų gyventojų.

**Komanda** - Augustas Česnavičius, Dominik Lavcel, Vilius Ničiperovičius.



## Technologijos

### Backend:
- Node.js 18+
- Express.js
- PostgreSQL 14+
- JWT autentifikacija
- Bcrypt slaptažodžių šifravimui

### Frontend:
- React
- Material-UI
- React Router
- Axios
- Context API būsenų valdymui

## Diegimas

### 1. Klonuok repozitoriją
```bash
git clone https://github.com/NNTKLOne/MyDormyFinal.git
cd MyDormy
```

### 2. Backend nustatymas
```bash
cd backend
npm install
cp .env.example .env
# Redaguok .env failą su savo duomenų bazės nustatymais
npm run migrate
npm run seed
npm run dev
```

### 3. Frontend nustatymas
```bash
cd frontend
npm install
npm run dev
```


### Sprint 1: Pagrindinis funkcionalumas
- Prisijungimas ir autentifikacija
- Paskyros sukūrimas
- Kambarių paieška su filtrais
- Kambario rezervacija
- Apžiūros laiko rezervavimas
- Apžiūros laiko tvirtinimas

### Sprint 2: Administravimas
- Sutarčių valdymas
- Sutarčių pasirašymas
- Sutarčių peržiūra ir tvirtinimas

### Sprint 3: 
- Kambarių informacijos valdymas
- Buvimo kambaryje būsenos valdymas
