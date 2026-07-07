import { useState, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

const roleTabs = [
  { label: "Student", value: "student" },
  { label: "Staff", value: "staff" },
  { label: "Admin", value: "admin" },
];


export const WebsiteLogin = (): JSX.Element => {
  const [activeRole, setActiveRole] = useState("student");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authCode, setAuthCode] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const { login, register, loginPending, registerPending, loginError, registerError } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const isPending = loginPending || registerPending;
  const error = loginError || registerError;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (mode === "login") {
        await login({ username, password, role: activeRole });
      } else {
        await register({ username, password, role: activeRole, authCode });
      }
      navigate("/dashboard");
    } catch (err: any) {
      toast({
        title: mode === "login" ? "Login failed" : "Registration failed",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 md:p-8 lg:p-12 relative [background:radial-gradient(50%_50%_at_0%_0%,rgba(0,27,61,1)_0%,rgba(0,27,61,0)_50%),radial-gradient(50%_50%_at_100%_0%,rgba(0,74,198,1)_0%,rgba(0,74,198,0)_50%),radial-gradient(50%_50%_at_100%_100%,rgba(251,250,238,1)_0%,rgba(251,250,238,0)_50%),radial-gradient(50%_50%_at_0%_100%,rgba(37,99,235,1)_0%,rgba(37,99,235,0)_50%),radial-gradient(50%_50%_at_50%_50%,rgba(0,74,198,1)_0%,rgba(0,74,198,0)_50%),linear-gradient(0deg,rgba(251,250,238,1)_0%,rgba(251,250,238,1)_100%)] overflow-x-hidden w-full">
      <div className="grid grid-cols-1 lg:grid-cols-12 max-w-6xl w-full h-fit bg-[#ffffff01] rounded-[32px] md:rounded-[48px] overflow-hidden shadow-[0px_40px_100px_#00000026]">
        {/* Left Side - Login Form */}
        <div className="relative col-span-1 lg:col-span-5 w-full h-full flex flex-col items-start justify-between p-6 md:p-12 bg-[#fbfaeea6] border-b lg:border-b-0 lg:border-r border-[#c3c6d726] backdrop-blur-[20px] backdrop-brightness-[100%] [-webkit-backdrop-filter:blur(20px)_brightness(100%)]">
          <div className="flex flex-col items-start gap-6 md:gap-8 pt-0 pb-4 px-0 relative self-stretch w-full flex-grow">
            <div className="flex items-center gap-2 relative self-stretch w-full">
              <img
                src="/laundrolink-logo.png"
                alt="LaundroLink"
                className="h-8 md:h-10 w-auto object-contain"
              />
            </div>

            <header className="flex flex-col items-start gap-2 pt-2 md:pt-4 pb-2 px-0 relative self-stretch w-full bg-transparent">
              <h1 className="relative flex items-center self-stretch [font-family:'Manrope',Helvetica] font-extrabold text-[#001b3d] text-3xl md:text-4xl tracking-[0] leading-tight">
                {mode === "login" ? "Welcome Back" : "Create Account"}
              </h1>
              <p className="relative flex items-center self-stretch [font-family:'Manrope',Helvetica] font-medium text-[#495f84] text-sm md:text-base tracking-[0] leading-6">
                LaundroLink Premium Ecosystem Access
              </p>
            </header>

            <div className="flex items-start justify-center p-1 relative self-stretch w-full bg-[#e9e9dd4c] rounded-full">
              {roleTabs.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setActiveRole(tab.value)}
                  className={`flex justify-center px-2 md:px-4 py-2 flex-1 grow rounded-full flex-col items-center relative transition-all ${
                    activeRole === tab.value ? "bg-white shadow-[0px_1px_2px_#0000000d]" : ""
                  }`}
                >
                  <span
                    className={`flex items-center justify-center h-5 font-bold text-xs md:text-sm text-center tracking-[0] leading-5 whitespace-nowrap relative [font-family:'Manrope',Helvetica] ${
                      activeRole === tab.value ? "text-[#004ac6]" : "text-[#495f84]"
                    }`}
                  >
                    {tab.label}
                  </span>
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col items-start gap-4 md:gap-5 relative self-stretch w-full">
              <div className="relative self-stretch w-full min-h-[70px] md:h-20">
                <label className="block mb-2 [font-family:'Manrope',Helvetica] font-bold text-[#001b3d] text-[10px] md:text-xs tracking-[1.20px] leading-4 uppercase">
                  USERNAME
                </label>
                <div className="relative flex items-center bg-[#ffffff80] rounded-[24px] md:rounded-[32px] overflow-hidden border border-[#c3c6d726]">
                  <img className="absolute left-4 md:left-5 w-4 h-4" alt="User Icon" src="/figmaAssets/icon-2.svg" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. alex.clean"
                    required
                    className="w-full pl-12 md:pl-14 pr-4 py-3 md:py-[17px] bg-transparent outline-none [font-family:'Manrope',Helvetica] text-[#001b3d] placeholder-[#495f8480] text-sm md:text-base"
                  />
                </div>
              </div>

              <div className="flex flex-col items-end gap-2 relative self-stretch w-full">
                <div className="flex w-full items-center justify-between relative">
                  <label className="flex items-center font-bold text-[#001b3d] text-[10px] md:text-xs tracking-[1.20px] leading-4 uppercase relative [font-family:'Manrope',Helvetica]">
                    PASSWORD
                  </label>
                </div>
                <div className="relative flex items-center self-stretch bg-[#ffffff80] rounded-[24px] md:rounded-[32px] overflow-hidden border border-[#c3c6d726]">
                  <img className="absolute left-4 md:left-5 w-4 h-4" alt="Lock Icon" src="/figmaAssets/icon-4.svg" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full pl-12 md:pl-14 pr-4 py-3 md:py-[17px] bg-transparent outline-none [font-family:'Manrope',Helvetica] text-[#001b3d] placeholder-[#495f8480] text-sm md:text-base"
                  />
                </div>
              </div>

              {mode === "register" && (
                <div className="relative self-stretch w-full min-h-[70px] md:h-20">
                  <label className="block mb-2 [font-family:'Manrope',Helvetica] font-bold text-[#001b3d] text-[10px] md:text-xs tracking-[1.20px] leading-4 uppercase">
                    AUTH CODE
                  </label>
                  <div className="relative flex items-center bg-[#ffffff80] rounded-[24px] md:rounded-[32px] overflow-hidden border border-[#c3c6d726]">
                    <img className="absolute left-4 md:left-5 w-4 h-4" alt="Code Icon" src="/figmaAssets/icon-2.svg" />
                    <input
                      type="text"
                      value={authCode}
                      onChange={(e) => setAuthCode(e.target.value)}
                      placeholder="••••"
                      required={mode === "register"}
                      className="w-full pl-12 md:pl-14 pr-4 py-3 md:py-[17px] bg-transparent outline-none [font-family:'Manrope',Helvetica] text-[#001b3d] placeholder-[#495f8480] text-sm md:text-base"
                    />
                  </div>
                </div>
              )}

              {error && (
                <p className="text-red-600 text-xs md:text-sm [font-family:'Manrope',Helvetica] font-medium">
                  {error.message}
                </p>
              )}

              <Button
                type="submit"
                disabled={isPending}
                className="flex items-center justify-center gap-2 px-0 py-3 md:py-4 h-auto relative self-stretch w-full bg-[#004ac6] rounded-[24px] md:rounded-[32px] shadow-[0px_15px_30px_#004ac64c] hover:bg-[#003da8] transition-colors disabled:opacity-60"
              >
                <span className="font-extrabold text-white text-sm md:text-base text-center tracking-[0] leading-6 whitespace-nowrap relative [font-family:'Manrope',Helvetica]">
                  {isPending ? "Please wait..." : mode === "login" ? "Login" : "Create Account"}
                </span>
                {!isPending && (
                  <img className="relative w-4 h-4" alt="Arrow" src="/figmaAssets/container-1.svg" />
                )}
              </Button>

              <button
                type="button"
                onClick={() => setMode(mode === "login" ? "register" : "login")}
                className="self-center text-xs md:text-sm text-[#495f84] [font-family:'Manrope',Helvetica] hover:text-[#004ac6] transition-colors mt-2"
              >
                {mode === "login" ? "No account? Sign up" : "Already have an account? Log in"}
              </button>
            </form>
          </div>
        </div>

        {/* Right Side - Marketing/Banner (Hidden on small screens) */}
        <div className="relative hidden lg:flex col-span-7 w-full min-h-[600px] flex-col items-center justify-center p-12 bg-[#001b3d] overflow-hidden">
          <div className="absolute inset-0 opacity-40 bg-[url(/figmaAssets/ab6axucjv51rupbl4lgwxbndaliwwaeig4mz2kjx-jnpk5-ziqez9eihm3c6clok.png)] bg-cover bg-center" />
          <div className="absolute inset-0 bg-[linear-gradient(55deg,rgba(0,27,61,1)_0%,rgba(0,27,61,0.4)_50%,rgba(0,27,61,0)_100%)]" />
          
          <div className="relative z-10 flex flex-col items-start gap-6 max-w-md">
            <div className="w-16 h-0.5 bg-[#004ac6]" />
            <h2 className="font-extrabold text-[#fbfaee] text-4xl md:text-5xl tracking-[0] leading-tight [font-family:'Manrope',Helvetica]">
              Elevating the
              <br />
              fabric of daily life.
            </h2>
            <p className="font-medium text-[#fbfaeeb2] text-lg md:text-xl tracking-[0] leading-relaxed [font-family:'Manrope',Helvetica]">
              Experience the Ethereal Atelier of garment care.
              <br />
              Intelligent tracking for the modern academic lifestyle.
            </p>
          </div>


        </div>
      </div>

    </div>
  );
};
