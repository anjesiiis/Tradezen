import { useEffect } from "react";
import { getAdminToken } from "./adminApi";

export default function RequireAdmin({ children }) {
  const autorizado = !!getAdminToken();

  useEffect(() => {
    if (!autorizado) window.location.replace("/admin/login");
  }, [autorizado]);

  if (!autorizado) return null;
  return children;
}
