import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mail, Phone, CheckCircle, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "./ui/textarea";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { auth } from "@/lib/firebase";

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
  }
}

const RATE_LIMIT_DELAY = 30000; // 30 seconds cooldown
let lastRequestTime = 0;

const CTASection = () => {
  const { toast } = useToast();
  const [step, setStep] = useState<"form" | "otp" | "thankyou">("form");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [concern, setConcern] = useState("");
  const [phoneError, setPhoneError] = useState("");

  // OTP state
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<any>(null);

  // reCAPTCHA lifecycle management
  useEffect(() => {
    const initializeRecaptcha = () => {
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(
          auth,
          "recaptcha-container",
          {
            size: "invisible",
            callback: (response) => {
              console.log("reCAPTCHA verified:", response);
            },
            "expired-callback": () => {
              window.recaptchaVerifier = null;
            },
          }
        );
      }
    };

    initializeRecaptcha();

    return () => {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    };
  }, []);

  const validatePhoneNumber = (phone: string): boolean => {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone);
  };

  const handleFirebaseError = (error: any) => {
    console.error("Firebase Error:", error);
    let message = "Failed to send OTP. Please try again.";

    switch (error.code) {
      case "auth/too-many-requests":
        message = "Too many attempts. Please try again later.";
        break;
      case "auth/invalid-phone-number":
        message = "Invalid phone number format";
        break;
      case "auth/quota-exceeded":
        message = "Daily quota exceeded. Contact support.";
        break;
      case "auth/billing-not-enabled":
        message = "Billing not enabled. Contact support.";
        break;
    }

    toast({
      title: "Error",
      description: message,
      variant: "destructive",
    });
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const now = Date.now();
    if (now - lastRequestTime < RATE_LIMIT_DELAY) {
      toast({
        title: "Please Wait",
        description: "You can request a new OTP after 30 seconds",
        variant: "destructive",
      });
      return;
    }

    if (!validatePhoneNumber(phone)) {
      setPhoneError("Please enter a valid 10-digit Indian phone number");
      return;
    }
    setPhoneError("");

    setIsSubmitting(true);
    try {
      const appVerifier = window.recaptchaVerifier;
      if (!appVerifier) throw new Error("reCAPTCHA not initialized");

      const result = await signInWithPhoneNumber(auth, `+91${phone}`, appVerifier);
      console.log("OTP sent successfully:", result);
      
      lastRequestTime = Date.now();
      setConfirmationResult(result);
      toast({
        title: "OTP Sent",
        description: "Please check your phone for the verification code",
        variant: "default",
      });
      setStep("otp");
    } catch (error: any) {
      handleFirebaseError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!confirmationResult) return;

    setIsSubmitting(true);
    try {
      await confirmationResult.confirm(otp);
      await submitToGoogleSheets();
      setStep("thankyou");
    } catch (error: any) {
      setOtpError(error.message.includes("invalid-verification-code") 
        ? "Invalid OTP. Please try again."
        : "Verification failed. Please request a new OTP.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitToGoogleSheets = async () => {
    try {
      const formData = new FormData();
      formData.append("Name", name);
      formData.append("Email", email);
      formData.append("Phone", phone);
      formData.append("Concern", concern);
      formData.append("Timestamp", new Date().toISOString());

      await fetch(
        "https://script.google.com/macros/s/AKfycbzS-_n5tlwWP3vC5pKDEScaanAxWViApqxDxPjGRX1yLd_EqkFeVpXG5lBlbNUvCO76PQ/exec",
        { method: "POST", body: formData }
      );
    } catch (error) {
      console.error("Error submitting to Google Sheets:", error);
      toast({
        title: "Submission Error",
        description: "Failed to save details. Please contact support.",
        variant: "destructive",
      });
    }
  };

  const handleResendOtp = async () => {
    setIsSubmitting(true);
    try {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
      }
      
      window.recaptchaVerifier = new RecaptchaVerifier(
        auth,
        "recaptcha-container",
        { size: "invisible" }
      );

      const result = await signInWithPhoneNumber(
        auth,
        `+91${phone}`,
        window.recaptchaVerifier
      );
      
      setConfirmationResult(result);
      toast({
        title: "OTP Resent",
        description: "New verification code sent",
        variant: "default",
      });
    } catch (error) {
      handleFirebaseError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangePhone = () => {
    setStep("form");
    setOtp("");
    setOtpError("");
    setConfirmationResult(null);
  };

  return (
    <section id="CTA" className="py-20">
      <div className="container px-4 md:px-6">
        <div className="max-w-6xl mx-auto bg-gradient-to-br from-woof-blue to-woof-purple rounded-3xl shadow-xl overflow-hidden">
          <div className="grid md:grid-cols-2">
            <div className="p-8 md:p-12 flex flex-col justify-center">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Protect your child's digital journey today
              </h2>
              <p className="text-lg text-white/80 mb-8">
                Join thousands of Indian families who trust Woof to keep their children safe online. No credit card required.
              </p>
              <Button size="lg" className="bg-white text-woof-purple hover:bg-gray-100">
                Get Started
              </Button>
            </div>

            <div className="bg-white/10 backdrop-blur-sm p-8 md:p-12">
              <div className="max-w-md mx-auto">
                {step === "form" && (
                  <>
                    <h3 className="text-2xl font-semibold text-white mb-6">
                      Want us to contact you?
                    </h3>
                    <form onSubmit={handleFormSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-white">Name*</Label>
                        <Input
                          id="name"
                          placeholder="Enter your name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                          className="border-white/30 bg-white/10 text-white placeholder:text-white/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-white">Email*</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
                          <Input
                            id="email"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="pl-10 border-white/30 bg-white/10 text-white placeholder:text-white/50"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-white">Phone Number*</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
                          <Input
                            id="phone"
                            placeholder="Your 10-digit mobile number"
                            value={phone}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                              setPhone(val);
                            }}
                            required
                            className={`pl-10 border ${
                              phoneError ? "border-red-500" : "border-white/30"
                            } bg-white/10 text-white placeholder:text-white/50`}
                          />
                        </div>
                        {phoneError && (
                          <p className="text-red-500 text-sm">{phoneError}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="concern" className="text-white">
                          What is your primary concern for your child's digital safety?
                        </Label>
                        <Textarea
                          id="concern"
                          placeholder="Enter your concern"
                          value={concern}
                          onChange={(e) => setConcern(e.target.value)}
                          className="w-full border-white/30 bg-white/10 text-white placeholder:text-white/50 rounded-md p-3"
                        />
                      </div>
                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-white text-woof-purple hover:bg-gray-100"
                      >
                        {isSubmitting ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Sending OTP...
                          </div>
                        ) : "Get in Touch"}
                      </Button>
                      <p className="text-xs text-white/70 text-center mt-2">
                        We value your privacy and follow all TRAI & IT Act regulations.
                      </p>
                      <div id="recaptcha-container" className="hidden" />
                    </form>
                  </>
                )}

                {step === "otp" && (
                  <>
                    <h3 className="text-2xl font-semibold text-white mb-6">Enter OTP</h3>
                    <form onSubmit={handleOtpSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="otp" className="text-white">OTP Code</Label>
                        <Input
                          id="otp"
                          placeholder="Enter 6-digit OTP"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          className="border-white/30 bg-white/10 text-white placeholder:text-white/50"
                        />
                      </div>
                      {otpError && <p className="text-red-500 text-sm">{otpError}</p>}
                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-white text-woof-purple hover:bg-gray-100"
                      >
                        {isSubmitting ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Verifying...
                          </div>
                        ) : "Verify OTP"}
                      </Button>
                    </form>
                    <div className="flex justify-between items-center mt-4">
                      <Button
                        variant="link"
                        onClick={handleResendOtp}
                        className="text-white underline p-0"
                        disabled={isSubmitting}
                      >
                        Resend OTP
                      </Button>
                      <Button
                        variant="link"
                        onClick={handleChangePhone}
                        className="text-white underline p-0"
                      >
                        Change Phone Number
                      </Button>
                    </div>
                  </>
                )}

                {step === "thankyou" && (
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <CheckCircle className="h-16 w-16 text-green-500" />
                    <h3 className="text-3xl font-bold text-center text-white">Thank you!</h3>
                    <p className="text-white/80 text-center">
                      You have been added to the waitlist. Our team will reach out to you shortly.
                      We appreciate your interest and look forward to connecting with you soon.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;