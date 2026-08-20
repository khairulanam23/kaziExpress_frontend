"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2, Plus, Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useCreateEmployee } from "@/hooks/queries/use-users";
import { getApiErrorMessage } from "@/lib/api-client";

export function CreateEmployeeDialog() {
  const [open, setOpen] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [form, setForm] = React.useState({
    email: "",
    password: "",
    name: "",
    phone: "",
    role: "EMPLOYEE" as "EMPLOYEE" | "ADMIN",
    department: "",
    hourlyRate: "",
    payCalculationMode: "HOURLY" as "HOURLY" | "DAILY_PLUS_OVERTIME",
  });

  const createEmployee = useCreateEmployee();

  const reset = () =>
    setForm({
      email: "",
      password: "",
      name: "",
      phone: "",
      role: "EMPLOYEE",
      department: "",
      hourlyRate: "",
      payCalculationMode: "HOURLY",
    });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      toast.error("Email and password are required");
      return;
    }
    if (form.role === "EMPLOYEE" && !form.hourlyRate) {
      toast.error("Hourly rate is required for employees");
      return;
    }

    createEmployee.mutate(
      {
        email: form.email,
        password: form.password,
        name: form.name || undefined,
        phone: form.phone || undefined,
        role: form.role,
        profile:
          form.role === "EMPLOYEE"
            ? {
                hourlyRate: Number(form.hourlyRate),
                payCalculationMode: form.payCalculationMode,
                department: form.department || undefined,
              }
            : undefined,
      },
      {
        onSuccess: () => {
          toast.success("User added", { description: `${form.name || form.email} was added.` });
          setOpen(false);
          reset();
        },
        onError: (error) => toast.error("Couldn't add user", { description: getApiErrorMessage(error) }),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus /> Add employee/admin
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add new user</DialogTitle>
          <DialogDescription>Create an account and set privileges for this user.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5 col-span-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v as typeof f.role }))}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMPLOYEE">Employee</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5 col-span-2">
              <Label htmlFor="password">Temporary password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground cursor-pointer"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
            </div>
          </div>

          {form.role === "EMPLOYEE" && (
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="department">Department</Label>
                <Input id="department" value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="hourlyRate">Hourly rate</Label>
                <Input id="hourlyRate" type="number" value={form.hourlyRate} onChange={(e) => setForm((f) => ({ ...f, hourlyRate: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Pay mode</Label>
                <Select value={form.payCalculationMode} onValueChange={(v) => setForm((f) => ({ ...f, payCalculationMode: v as typeof f.payCalculationMode }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HOURLY">Hourly</SelectItem>
                    <SelectItem value="DAILY_PLUS_OVERTIME">Daily + overtime</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createEmployee.isPending}>
              {createEmployee.isPending && <Loader2 className="size-4 animate-spin mr-2" />}
              Add User
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
