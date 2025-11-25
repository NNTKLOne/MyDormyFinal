export const forcePasswordChange = (req, res, next) => {
    // Jei nėra user objekto, praleidžiam (authMiddleware sugaus)
    if (!req.user) return next();

    // Leidžiame keisti slaptažodį
    if (req.path.includes("/change-password")) {
        return next();
    }

    // Leidžiame login (nors jį ir taip tvarko kita vieta)
    if (req.path.includes("/login")) {
        return next();
    }

    // Jei vartotojas turi privalomai pakeisti slaptažodį → BLOKUOJAM VISKĄ
    if (req.user.must_change_password) {
        return res.status(403).json({
            success: false,
            message: "Prašome pasikeisti slaptažodį",
            mustChangePassword: true
        });
    }

    next();
};
