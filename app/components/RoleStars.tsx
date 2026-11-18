type RoleStarsProps = {
  roles?: string[] | null;
};

export default function RoleStars({ roles = [] }: RoleStarsProps) {
  if (roles?.includes("superadmin")) {
    return (
      <span
        title="Superadministrador"
        aria-label="Superadministrador"
        className="ml-1 whitespace-nowrap"
      >
        ⭐⭐⭐
      </span>
    );
  }

  if (roles?.includes("admin")) {
    return (
      <span
        title="Administrador"
        aria-label="Administrador"
        className="ml-1 whitespace-nowrap"
      >
        ⭐
      </span>
    );
  }

  return null;
}