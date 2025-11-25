export function getRedirectForRole(role) {
    switch (role) {
        case "STUDENT":
            return "/rooms";

        case "UNIVERSITY_ADMIN":
            return "/admin";

        case "DORMITORY_ADMIN":
            return "/dorm-admin";

        case "SUPERVISOR":
            return "/supervisor";

        default:
            return "/rooms";
    }
}
