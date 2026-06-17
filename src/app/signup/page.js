"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { postData } from "@/lib/api";
import { showSuccess, showError, extractApiMessage } from "@/lib/toast";

export default function SignUpPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    department: "",
    contactNumber: "",
    role: "RFQFiller",
  });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    const { email, password, confirmPassword, firstName, lastName, department, contactNumber, role } = form;

    if (!email || !password || !firstName || !lastName || !department || !contactNumber) {
      showError("Please fill in all fields.");
      return;
    }
    if (password !== confirmPassword) {
      showError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await postData("/auth/signup/", {
        email: email.trim(),
        password,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        department: department.trim(),
        contact_number: contactNumber.replace(/\D/g, ""),
        role,
      });
      showSuccess(res?.message || "Account created successfully. Please login.");
      router.push("/login");
    } catch (err) {
      showError(extractApiMessage(err, "Registration failed."));
    } finally {
      setLoading(false);
    }
  };

  const Field = ({ label, name, type = "text", placeholder }) => (
    <div className="mb-3">
      <label className="block text-sm font-semibold text-slate-700 mb-1">{label}</label>
      <input
        type={type}
        value={form[name]}
        onChange={update(name)}
        placeholder={placeholder}
        className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-slate-50 outline-none focus:border-orange-400"
      />
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-slate-50">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-lg bg-white rounded-3xl p-8 shadow-xl"
      >
        <div className="flex justify-center mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icon.png"
            alt="Ornate Solar"
            className="h-14 w-auto object-contain"
          />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-1">Create Account</h1>
        <p className="text-slate-500 text-sm mb-6">Sign up for inverter monitoring</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
          <Field label="First Name" name="firstName" placeholder="John" />
          <Field label="Last Name" name="lastName" placeholder="Doe" />
        </div>
        <Field label="Email" name="email" type="email" placeholder="you@ornatesolar.com" />
        <Field label="Department" name="department" placeholder="Engineering" />
        <Field label="Contact Number" name="contactNumber" placeholder="9876543210" />

        <div className="mb-3">
          <label className="block text-sm font-semibold text-slate-700 mb-1">Password</label>
          <div className="flex items-center px-4 border border-slate-300 rounded-xl bg-slate-50">
            <input
              type={showPwd ? "text" : "password"}
              value={form.password}
              onChange={update("password")}
              placeholder="At least 8 characters"
              className="flex-1 py-3 bg-transparent outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPwd((s) => !s)}
              className="text-xs text-slate-500"
            >
              {showPwd ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <Field label="Confirm Password" name="confirmPassword" type="password" placeholder="Repeat password" />

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 mt-4 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold flex items-center justify-center disabled:opacity-60"
        >
          {loading ? <Loader2 className="animate-spin" /> : "Create Account"}
        </button>

        <div className="text-center mt-4 text-sm">
          <span className="text-slate-500">Already have an account? </span>
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="text-orange-500 font-bold"
          >
            Sign In
          </button>
        </div>
      </form>
    </div>
  );
}
