import { Navigate } from "react-router-dom";

export const isLoggedIn = () => !!localStorage.getItem("token");

interface Props {
  children: JSX.Element;
}

export default function ProtectedRoute({ children }: Props) {
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }
  return children;
}
