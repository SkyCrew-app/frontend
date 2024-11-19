'use client';

import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useMutation } from "@apollo/client";
import { useRouter } from "next/navigation";
import React, { useState, useRef } from "react";
import { VERIFY_2FA_SECRET } from "@/graphql/user";
import { useToast } from "@/components/hooks/use-toast";

export default function TwoFactorAuthPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [otp, setOtp] = useState(Array(6).fill(""));
  const inputRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [verify2FASecret, { loading }] = useMutation(VERIFY_2FA_SECRET);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(0, 1);
    setOtp(newOtp);

    if (value && index < otp.length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = document.cookie.split("; ").find((row) => row.startsWith("email="))?.split("=")[1];

    try {
      await verify2FASecret({
        variables: {
          email: email,
          token: otp.join(""),
        },
      });

      router.push("/dashboard");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Le code OTP est invalide.",
      });
    }
  };

  return (
    <>
    <div className="flex min-h-screen items-center justify-center bg-background">
    <Card>
      <CardHeader>
        <CardTitle>Authentification à deux facteurs</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <Label htmlFor="otp">Code OTP</Label>
          <InputOTP maxLength={6}>
            <InputOTPGroup>
              {Array.from({ length: 6 }, (_, index) => (
                <InputOTPSlot
                  key={index}
                  index={index}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                >
                  <input
                    id={`otp-${index}`}
                    className="w-full h-full text-center bg-transparent border-none outline-none"
                    value={otp[index]}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    maxLength={1}
                  />
                </InputOTPSlot>
              ))}
            </InputOTPGroup>
          </InputOTP>
          <Button type="submit" disabled={loading} className="mt-4">
            Valider
          </Button>
        </form>
      </CardContent>
    </Card>
    </div>
    </>
  );
}
