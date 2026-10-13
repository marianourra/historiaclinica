import { Link } from "react-router-dom";

export function BackLink({ to, children }: { to: string; children: string }) {
  return (
    <Link to={to} className="btn-primary inline-flex">
      {children}
    </Link>
  );
}
