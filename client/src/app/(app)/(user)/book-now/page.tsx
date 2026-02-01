"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { CalendarIcon, Clock, MapPin, Phone, User, CheckCircle2, Mail } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useCreateBookingMutation } from "@/lib/store/Service/api";

const bookingSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email address"),
    phone_number: z.string().min(10, "Please enter a valid phone number"),
    location: z.string().min(5, "Please enter your address"),
    measurement_type: z.enum(["in_store", "home_visit"]),
    preferred_date: z.date({ required_error: "Please select a date" }),
    preferred_time: z.string().min(1, "Please select a time"),
    customer_notes: z.string().optional(),
});

type BookingFormData = z.infer<typeof bookingSchema>;

export default function BookNowPage() {
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [createBooking, { isLoading }] = useCreateBookingMutation();

    const form = useForm<BookingFormData>({
        resolver: zodResolver(bookingSchema),
        defaultValues: {
            name: "",
            email: "",
            phone_number: "",
            location: "",
            measurement_type: "in_store",
            preferred_time: "",
            customer_notes: "",
        },
    });

    const onSubmit = async (data: BookingFormData) => {
        try {
            const formattedData = {
                ...data,
                preferred_date: format(data.preferred_date, "yyyy-MM-dd"),
            };

            await createBooking({ data: formattedData }).unwrap();
            setIsSubmitted(true);
            toast.success("Booking submitted successfully!");
        } catch (error) {
            console.error("Booking error:", error);
            toast.error("Failed to submit booking. Please try again.");
        }
    };

    const timeSlots = [
        "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
        "12:00", "12:30", "14:00", "14:30", "15:00", "15:30",
        "16:00", "16:30", "17:00", "17:30"
    ];

    if (isSubmitted) {
        return (
            <main className="pt-3 w-full px-5 lg:px-14 flex gap-3 flex-col pb-10 max-w-[95rem] items-center h-full min-h-[calc(100dvh_-_11dvh)]">
                <div className="h-full flex flex-col gap-8 items-center justify-center w-full mt-20">
                    <Card className="max-w-md w-full text-center border shadow-sm">
                        <CardContent className="pt-10 pb-10">
                            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
                                <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
                            </div>
                            <h2 className="text-2xl font-bold mb-2">Booking Confirmed!</h2>
                            <p className="text-neutral-600 dark:text-neutral-300 mb-6">
                                Thank you for booking with us. A confirmation email has been sent to your inbox. We will contact you shortly to confirm your appointment.
                            </p>
                            <Button onClick={() => setIsSubmitted(false)} variant="outline">
                                Book Another Appointment
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </main>
        );
    }

    return (
        <main className="pt-3 w-full px-5 lg:px-14 flex gap-3 flex-col pb-10 max-w-[95rem] items-center h-full min-h-[calc(100dvh_-_11dvh)]">
            {/* Header Section */}
            <div className="h-full flex flex-col gap-8 items-center w-full mt-10">
                <div className="text-center">
                    <h1 className="text-[50px] font-semibold mb-4">Book Your Measurement</h1>
                    <p className="text-neutral-600 dark:text-neutral-300 text-lg max-w-2xl">
                        Experience premium tailoring with our expert measurement service.
                        Choose between in-store visits or home appointments.
                    </p>
                </div>

                {/* Main Content - Video and Form Side by Side */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full mt-8">
                    {/* Video Section */}
                    <Card className="bg-white dark:bg-neutral-900/50 rounded-xl border shadow-sm overflow-hidden">
                        <div className="relative w-full aspect-video bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
                            <video
                                autoPlay
                                loop
                                muted
                                playsInline
                                className="absolute inset-0 w-full h-full object-cover"
                                poster="/placeholder-video-poster.jpg"
                            >
                                <source src="/brand-video.mp4" type="video/mp4" />
                            </video>
                            {/* Fallback content if no video */}
                            <div className="absolute inset-0 flex items-center justify-center text-white">
                                <div className="text-center p-8">
                                    <h3 className="text-2xl font-semibold mb-2">Premium Tailoring</h3>
                                    <p className="text-white/80">Experience the art of bespoke fashion</p>
                                </div>
                            </div>
                        </div>
                        <CardContent className="p-6">
                            <h3 className="font-medium text-lg mb-2">Why Choose Us?</h3>
                            <ul className="space-y-2 text-neutral-600 dark:text-neutral-300">
                                <li className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                    Expert tailors with years of experience
                                </li>
                                <li className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                    Precise measurements for perfect fit
                                </li>
                                <li className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                    Home visit option available
                                </li>
                                <li className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                    Flexible scheduling
                                </li>
                            </ul>
                        </CardContent>
                    </Card>

                    {/* Booking Form */}
                    <Card className="bg-white dark:bg-neutral-900/50 p-3 rounded-xl border shadow-sm w-full">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xl">Schedule Your Appointment</CardTitle>
                            <CardDescription>
                                Fill in your details below and we'll confirm your booking
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                                {/* Personal Information */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name" className="flex items-center gap-2">
                                            <User className="w-4 h-4" />
                                            Full Name *
                                        </Label>
                                        <Input
                                            id="name"
                                            placeholder="Enter your full name"
                                            {...form.register("name")}
                                            className={cn(form.formState.errors.name && "border-red-500")}
                                        />
                                        {form.formState.errors.name && (
                                            <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="email" className="flex items-center gap-2">
                                            <Mail className="w-4 h-4" />
                                            Email Address *
                                        </Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="Enter your email"
                                            {...form.register("email")}
                                            className={cn(form.formState.errors.email && "border-red-500")}
                                        />
                                        {form.formState.errors.email && (
                                            <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="phone_number" className="flex items-center gap-2">
                                            <Phone className="w-4 h-4" />
                                            Phone Number *
                                        </Label>
                                        <Input
                                            id="phone_number"
                                            placeholder="Enter your phone number"
                                            {...form.register("phone_number")}
                                            className={cn(form.formState.errors.phone_number && "border-red-500")}
                                        />
                                        {form.formState.errors.phone_number && (
                                            <p className="text-sm text-red-500">{form.formState.errors.phone_number.message}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="location" className="flex items-center gap-2">
                                            <MapPin className="w-4 h-4" />
                                            Address / Location *
                                        </Label>
                                        <Input
                                            id="location"
                                            placeholder="Enter your address"
                                            {...form.register("location")}
                                            className={cn(form.formState.errors.location && "border-red-500")}
                                        />
                                        {form.formState.errors.location && (
                                            <p className="text-sm text-red-500">{form.formState.errors.location.message}</p>
                                        )}
                                    </div>
                                </div>



                                {/* Measurement Type */}
                                <div className="space-y-3">
                                    <Label className="text-base font-medium">Measurement Type</Label>
                                    <RadioGroup
                                        defaultValue="in_store"
                                        onValueChange={(value) => form.setValue("measurement_type", value as "in_store" | "home_visit")}
                                        className="grid grid-cols-2 gap-4"
                                    >
                                        <Label
                                            htmlFor="in_store"
                                            className="flex flex-col items-center justify-center rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer [&:has([data-state=checked])]:border-purple-500 [&:has([data-state=checked])]:bg-purple-50 dark:[&:has([data-state=checked])]:bg-purple-900/20"
                                        >
                                            <RadioGroupItem value="in_store" id="in_store" className="sr-only" />
                                            <div className="text-2xl mb-1">🏪</div>
                                            <div className="font-medium text-sm">In-Store</div>
                                        </Label>
                                        <Label
                                            htmlFor="home_visit"
                                            className="flex flex-col items-center justify-center rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer [&:has([data-state=checked])]:border-purple-500 [&:has([data-state=checked])]:bg-purple-50 dark:[&:has([data-state=checked])]:bg-purple-900/20"
                                        >
                                            <RadioGroupItem value="home_visit" id="home_visit" className="sr-only" />
                                            <div className="text-2xl mb-1">🏠</div>
                                            <div className="font-medium text-sm">Home Visit</div>
                                        </Label>
                                    </RadioGroup>
                                </div>

                                {/* Date and Time */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2">
                                            <CalendarIcon className="w-4 h-4" />
                                            Preferred Date
                                        </Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className={cn(
                                                        "w-full justify-start text-left font-normal",
                                                        !form.watch("preferred_date") && "text-muted-foreground",
                                                        form.formState.errors.preferred_date && "border-red-500"
                                                    )}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {form.watch("preferred_date") ? (
                                                        format(form.watch("preferred_date"), "PPP")
                                                    ) : (
                                                        "Select a date"
                                                    )}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={form.watch("preferred_date")}
                                                    onSelect={(date) => date && form.setValue("preferred_date", date)}
                                                    disabled={(date) => date < new Date()}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        {form.formState.errors.preferred_date && (
                                            <p className="text-sm text-red-500">{form.formState.errors.preferred_date.message}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2">
                                            <Clock className="w-4 h-4" />
                                            Preferred Time
                                        </Label>
                                        <select
                                            {...form.register("preferred_time")}
                                            className={cn(
                                                "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                                form.formState.errors.preferred_time && "border-red-500"
                                            )}
                                        >
                                            <option value="">Select a time</option>
                                            {timeSlots.map((time) => (
                                                <option key={time} value={time}>
                                                    {time}
                                                </option>
                                            ))}
                                        </select>
                                        {form.formState.errors.preferred_time && (
                                            <p className="text-sm text-red-500">{form.formState.errors.preferred_time.message}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Notes */}
                                <div className="space-y-2">
                                    <Label htmlFor="customer_notes">Additional Notes (Optional)</Label>
                                    <Textarea
                                        id="customer_notes"
                                        placeholder="Any special requests or requirements..."
                                        {...form.register("customer_notes")}
                                        rows={2}
                                    />
                                </div>

                                {/* Submit Button */}
                                <Button
                                    type="submit"
                                    className="w-full h-11"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <span className="flex items-center gap-2">
                                            <span className="animate-spin">⏳</span>
                                            Submitting...
                                        </span>
                                    ) : (
                                        "Book Appointment"
                                    )}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </main>
    );
}
