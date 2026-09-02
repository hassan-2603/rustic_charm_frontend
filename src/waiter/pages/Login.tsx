import { useNavigate } from "react-router-dom";
import { loginWaiter } from "../services/waiterService";

import { useState } from "react";

export default function Login() {
  const [waiterId, setWaiterId] = useState("");
  const [pin, setPin] = useState("");
  const navigate = useNavigate();
const handleLogin = async () => {
  try {
    const waiter = await loginWaiter(waiterId, pin);

    localStorage.setItem(
      "waiter",
      JSON.stringify(waiter)
    );

    navigate("/waiter/dashboard");

  } catch (error: any) {
    alert(error.message);
  }
};

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-center">

      <div className="bg-white shadow-xl rounded-2xl p-6 sm:p-10 w-full max-w-[380px]">

        <h1 className="text-3xl font-bold mb-8 text-center">
          Waiter Login
        </h1>

        <input
          placeholder="Waiter Name or ID"
          value={waiterId}
          onChange={(e) => setWaiterId(e.target.value)}
          className="w-full border rounded-lg p-3 mb-4"
        />

        <input
          type="password"
          placeholder="PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          className="w-full border rounded-lg p-3 mb-6"
        />

        <button
  onClick={handleLogin}
  className="w-full bg-black text-white py-3 rounded-lg"
>
  Login
</button>

      </div>

    </div>
  );
}