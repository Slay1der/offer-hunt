import { members } from "../../lib/auth.js";
import LoginForm from "./LoginForm.jsx";

export const dynamic = "force-dynamic";

export default function Login() {
  return <LoginForm members={members()} />;
}
