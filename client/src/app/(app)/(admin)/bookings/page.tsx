"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import {
  Search,
  RefreshCw,
  Edit,
  Trash2,
  Eye,
  Calendar,
  User,
  Phone,
  Mail,
  MapPin,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  Truck,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

import { useAuthUser } from "@/hooks/use-auth-user";
import {
  useGetBookingsQuery,
  useGetBookingQuery,
  useUpdateBookingStatusMutation,
  useUpdateMeasurementsMutation,
  useDeleteBookingMutation,
  useGetBookingStatsQuery,
  useCustomerLookupQuery,
} from "@/lib/store/Service/api";

const statusColors: Record<string, string> = {
  pending:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  confirmed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  in_progress:
    "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
  completed:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  delivered:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock className="w-4 h-4" />,
  confirmed: <CheckCircle className="w-4 h-4" />,
  in_progress: <Package className="w-4 h-4" />,
  completed: <CheckCircle className="w-4 h-4" />,
  delivered: <Truck className="w-4 h-4" />,
  cancelled: <XCircle className="w-4 h-4" />,
};

// Measurement field definitions
const coatFields = ["L", "C", "W", "H", "S", "B", "SL", "N"];
const pantFields = ["L", "W", "H", "T", "HIL", "K", "B"];
const shirtFields = ["L", "C", "W", "H", "S", "SL", "N"];

const measurementSchema = z.object({
  status: z.enum([
    "pending",
    "confirmed",
    "in_progress",
    "completed",
    "delivered",
    "cancelled",
  ]),
  delivery_date: z.string().optional(),
  admin_message: z.string().optional(),
  coat_measurements: z.record(z.record(z.string())).optional(),
  pant_measurements: z.record(z.record(z.string())).optional(),
  shirt_measurements: z.record(z.record(z.string())).optional(),
  send_email: z.boolean().optional(),
});

type MeasurementFormData = z.infer<typeof measurementSchema>;

interface Booking {
  id: number;
  name: string;
  email: string;
  phone_number: string;
  location: string;
  measurement_type: string;
  preferred_date: string;
  preferred_time: string;
  customer_notes?: string;
  status: string;
  bill_number?: string;
  delivery_date?: string;
  admin_message?: string;
  coat_measurements?: Record<string, Record<string, string>>;
  pant_measurements?: Record<string, Record<string, string>>;
  shirt_measurements?: Record<string, Record<string, string>>;
  has_measurements: boolean;
  created_at: string;
}

// Measurement Input Grid Component
function MeasurementGrid({
  fields,
  measurements,
  onChange,
  title,
}: {
  fields: string[];
  measurements: Record<string, Record<string, string>>;
  onChange: (field: string, column: "A" | "B", value: string) => void;
  title: string;
}) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-muted p-2 font-semibold text-center border-b text-sm">
        {title}
      </div>
      <div className="grid grid-cols-3 border-b bg-muted/50">
        <div className="p-2 text-center text-xs font-medium border-r"></div>
        <div className="p-2 text-center text-xs font-medium border-r">A</div>
        <div className="p-2 text-center text-xs font-medium">B</div>
      </div>
      {fields.map((field) => (
        <div key={field} className="grid grid-cols-3 border-b last:border-b-0">
          <div className="p-2 font-medium border-r bg-muted/30 flex items-center justify-center text-sm">
            {field}
          </div>
          <div className="p-1 border-r">
            <Input
              type="text"
              className="h-7 text-center text-sm"
              value={measurements[field]?.A || ""}
              onChange={(e) => onChange(field, "A", e.target.value)}
              placeholder="-"
            />
          </div>
          <div className="p-1">
            <Input
              type="text"
              className="h-7 text-center text-sm"
              value={measurements[field]?.B || ""}
              onChange={(e) => onChange(field, "B", e.target.value)}
              placeholder="-"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// Helper to format 24h time string to 12h AM/PM
function formatTimeAMPM(time: string): string {
  if (!time) return "";
  // Handle "HH:MM:SS" or "HH:MM"
  const parts = time.split(":");
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1] || "00";
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;
}

export default function AdminBookingsPage() {
  const { accessToken: token } = useAuthUser();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(
    null,
  );
  const [deleteBookingId, setDeleteBookingId] = useState<number | null>(null);
  const [lookupQuery, setLookupQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const {
    data: bookings,
    isLoading,
    refetch,
  } = useGetBookingsQuery(
    {
      token,
      status: statusFilter !== "all" ? statusFilter : undefined,
      search: searchQuery || undefined,
    },
    { skip: !token },
  );

  const { data: stats } = useGetBookingStatsQuery({ token }, { skip: !token });

  const {
    data: selectedBooking,
    isLoading: isLoadingBooking,
    refetch: refetchBooking,
  } = useGetBookingQuery(
    { id: selectedBookingId, token },
    {
      skip: !selectedBookingId || !token,
      refetchOnMountOrArgChange: true,
    },
  );

  const { data: lookupResults } = useCustomerLookupQuery(
    { query: lookupQuery, token },
    { skip: !lookupQuery || lookupQuery.length < 3 || !token },
  );

  const [updateStatus] = useUpdateBookingStatusMutation();
  const [updateMeasurements] = useUpdateMeasurementsMutation();
  const [deleteBooking] = useDeleteBookingMutation();

  const form = useForm<MeasurementFormData>({
    resolver: zodResolver(measurementSchema),
    defaultValues: {
      status: "pending",
      coat_measurements: {},
      pant_measurements: {},
      shirt_measurements: {},
      send_email: false,
    },
  });

  // Populate form when the fetched selectedBooking data arrives/changes
  const populateForm = useCallback(
    (booking: Booking) => {
      form.reset({
        status: booking.status as any,
        delivery_date: booking.delivery_date || "",
        admin_message: booking.admin_message || "",
        coat_measurements: booking.coat_measurements || {},
        pant_measurements: booking.pant_measurements || {},
        shirt_measurements: booking.shirt_measurements || {},
        send_email: false,
      });
    },
    [form],
  );

  // Auto-populate form when selectedBooking is fetched from API
  useEffect(() => {
    if (selectedBooking) {
      populateForm(selectedBooking);
    }
  }, [selectedBooking, populateForm]);

  const handleMeasurementChange = (
    type: "coat" | "pant" | "shirt",
    field: string,
    column: "A" | "B",
    value: string,
  ) => {
    const fieldName = `${type}_measurements` as const;
    const current = form.getValues(fieldName) || {};
    form.setValue(fieldName, {
      ...current,
      [field]: {
        ...(current[field] || {}),
        [column]: value,
      },
    });
  };

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      await updateStatus({ id, status: newStatus, token }).unwrap();
      toast.success(`Status updated to ${newStatus.replace("_", " ")}`);
      refetch();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const handleSaveMeasurements = async (data: MeasurementFormData) => {
    if (!selectedBookingId) return;

    setIsSaving(true);
    try {
      await updateMeasurements({
        id: selectedBookingId,
        data,
        token,
      }).unwrap();
      toast.success("Measurements saved successfully");
      if (data.send_email) {
        toast.success("Email sent to customer");
      }
      // Explicitly refetch both the list and the detail to ensure fresh data
      refetch();
      refetchBooking();
    } catch (error) {
      toast.error("Failed to save measurements");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteBookingId) return;
    try {
      await deleteBooking({ id: deleteBookingId, token }).unwrap();
      toast.success("Booking deleted");
      setDeleteBookingId(null);
    } catch (error) {
      toast.error("Failed to delete booking");
    }
  };

  const openBookingDetail = (booking: Booking) => {
    setSelectedBookingId(booking.id);
    // Form will auto-populate via useEffect when selectedBooking is fetched
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Bookings & Measurements</h1>
          <p className="text-muted-foreground">
            Manage customer bookings and record measurements
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold">{stats?.total || 0}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 dark:border-yellow-900">
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold text-yellow-600">
              {stats?.pending || 0}
            </p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 dark:border-blue-900">
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold text-blue-600">
              {stats?.confirmed || 0}
            </p>
            <p className="text-xs text-muted-foreground">Confirmed</p>
          </CardContent>
        </Card>
        <Card className="border-indigo-200 dark:border-indigo-900">
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold text-indigo-600">
              {stats?.in_progress || 0}
            </p>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 dark:border-green-900">
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold text-green-600">
              {stats?.completed || 0}
            </p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card className="border-purple-200 dark:border-purple-900">
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold text-purple-600">
              {stats?.delivered || 0}
            </p>
            <p className="text-xs text-muted-foreground">Delivered</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 dark:border-red-900">
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold text-red-600">
              {stats?.cancelled || 0}
            </p>
            <p className="text-xs text-muted-foreground">Cancelled</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4 flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, email, or bill number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="w-48">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bookings Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Appointment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Measurements</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-8 w-32" />
                    </TableCell>
                  </TableRow>
                ))
              ) : bookings?.length > 0 ? (
                bookings.map((b: Booking) => (
                  <TableRow
                    key={b.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => openBookingDetail(b)}
                  >
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{b.name}</span>
                        {b.bill_number && (
                          <span className="text-xs font-mono text-muted-foreground">
                            #{b.bill_number}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-sm">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {b.phone_number}
                        </span>
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Mail className="w-3 h-3" /> {b.email}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-sm">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(
                            new Date(b.preferred_date),
                            "MMM dd, yyyy",
                          )}{" "}
                          {formatTimeAMPM(b.preferred_time)}
                        </span>
                        <Badge variant="outline" className="w-fit text-xs mt-1">
                          {b.measurement_type === "in_store"
                            ? "🏪 In-Store"
                            : "🏠 Home Visit"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Select
                        value={b.status}
                        onValueChange={(value) =>
                          handleStatusChange(b.id, value)
                        }
                      >
                        <SelectTrigger
                          className={`${statusColors[b.status]} text-xs w-32 h-8 justify-start`}
                          customIcon={<></>}
                        >
                          {statusIcons[b.status]}
                          <span className="ml-1">
                            {b.status.replace("_", " ")}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="confirmed">Confirmed</SelectItem>
                          <SelectItem value="in_progress">
                            In Progress
                          </SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="delivered">Delivered</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {b.has_measurements ? (
                        <Badge
                          variant="secondary"
                          className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                        >
                          ✓ Recorded
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-muted-foreground"
                        >
                          Not yet
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell
                      className="text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openBookingDetail(b)}
                          title="View & Edit"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-600"
                          onClick={() => setDeleteBookingId(b.id)}
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No bookings found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={!!selectedBookingId}
        onOpenChange={() => setSelectedBookingId(null)}
      >
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Booking Details
              {selectedBooking?.bill_number && (
                <Badge variant="secondary" className="font-mono">
                  #{selectedBooking.bill_number}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              View customer info and record measurements
            </DialogDescription>
          </DialogHeader>

          {isLoadingBooking ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : (
            selectedBooking && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Side - Customer Info (Read-only) */}
                <div className="space-y-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <User className="w-5 h-5" />
                        Customer Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            Name
                          </Label>
                          <p className="font-medium">{selectedBooking.name}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            Email
                          </Label>
                          <p className="font-medium">{selectedBooking.email}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            Phone
                          </Label>
                          <p className="font-medium">
                            {selectedBooking.phone_number}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            Location
                          </Label>
                          <p className="font-medium">
                            {selectedBooking.location}
                          </p>
                        </div>
                      </div>
                      <Separator />
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            Appointment Date
                          </Label>
                          <p className="font-medium">
                            {format(
                              new Date(selectedBooking.preferred_date),
                              "MMMM dd, yyyy",
                            )}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            Time
                          </Label>
                          <p className="font-medium">
                            {formatTimeAMPM(selectedBooking.preferred_time)}
                          </p>
                        </div>
                        <div className="space-x-2">
                          <Label className="text-xs text-muted-foreground">
                            Type
                          </Label>
                          <Badge variant="outline">
                            {selectedBooking.measurement_type === "in_store"
                              ? "🏪 In-Store"
                              : "🏠 Home Visit"}
                          </Badge>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            Booked On
                          </Label>
                          <p className="font-medium">
                            {format(
                              new Date(selectedBooking.created_at),
                              "MMM dd, yyyy",
                            )}
                          </p>
                        </div>
                      </div>
                      {selectedBooking.customer_notes && (
                        <>
                          <Separator />
                          <div>
                            <Label className="text-xs text-muted-foreground">
                              Customer Notes
                            </Label>
                            <p className="text-sm bg-muted p-2 rounded mt-1">
                              {selectedBooking.customer_notes}
                            </p>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Right Side - Admin Form (Editable) */}
                <div>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Edit className="w-5 h-5" />
                        Record Measurements
                      </CardTitle>
                      <CardDescription>
                        Fill in measurements and update status
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form
                        onSubmit={form.handleSubmit(handleSaveMeasurements)}
                        className="space-y-4"
                      >
                        {/* Status and Delivery */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Status</Label>
                            <Select
                              value={form.watch("status")}
                              onValueChange={(v) =>
                                form.setValue("status", v as any)
                              }
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="confirmed">
                                  Confirmed
                                </SelectItem>
                                <SelectItem value="in_progress">
                                  In Progress
                                </SelectItem>
                                <SelectItem value="completed">
                                  Completed
                                </SelectItem>
                                <SelectItem value="delivered">
                                  Delivered
                                </SelectItem>
                                <SelectItem value="cancelled">
                                  Cancelled
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Expected Delivery</Label>
                            <Input
                              type="date"
                              className="h-9"
                              {...form.register("delivery_date")}
                            />
                          </div>
                        </div>

                        {/* Measurements */}
                        <Tabs defaultValue="coat" className="w-full">
                          <TabsList className="grid grid-cols-3 h-8">
                            <TabsTrigger value="coat" className="text-xs">
                              Coat & Safari
                            </TabsTrigger>
                            <TabsTrigger value="pant" className="text-xs">
                              Pant
                            </TabsTrigger>
                            <TabsTrigger value="shirt" className="text-xs">
                              Shirt
                            </TabsTrigger>
                          </TabsList>
                          <TabsContent value="coat" className="mt-2">
                            <MeasurementGrid
                              fields={coatFields}
                              measurements={
                                form.watch("coat_measurements") || {}
                              }
                              onChange={(f, c, v) =>
                                handleMeasurementChange("coat", f, c, v)
                              }
                              title="COAT & SAFARI, W. COAT"
                            />
                          </TabsContent>
                          <TabsContent value="pant" className="mt-2">
                            <MeasurementGrid
                              fields={pantFields}
                              measurements={
                                form.watch("pant_measurements") || {}
                              }
                              onChange={(f, c, v) =>
                                handleMeasurementChange("pant", f, c, v)
                              }
                              title="PANT"
                            />
                          </TabsContent>
                          <TabsContent value="shirt" className="mt-2">
                            <MeasurementGrid
                              fields={shirtFields}
                              measurements={
                                form.watch("shirt_measurements") || {}
                              }
                              onChange={(f, c, v) =>
                                handleMeasurementChange("shirt", f, c, v)
                              }
                              title="SHIRT"
                            />
                          </TabsContent>
                        </Tabs>

                        {/* Admin Message */}
                        <div className="space-y-1">
                          <Label className="text-xs">
                            Message to Customer (optional)
                          </Label>
                          <Textarea
                            {...form.register("admin_message")}
                            placeholder="Any notes or message to include in the email..."
                            rows={2}
                            className="text-sm"
                          />
                        </div>

                        {/* Email Option */}
                        <div className="flex items-center gap-2 p-2 bg-muted rounded">
                          <input
                            type="checkbox"
                            id="send_email"
                            {...form.register("send_email")}
                            className="rounded"
                          />
                          <Label
                            htmlFor="send_email"
                            className="text-sm cursor-pointer"
                          >
                            Send email notification to customer
                          </Label>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setSelectedBookingId(null)}
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                          <Button type="submit" className="flex-1">
                            Save Changes
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteBookingId}
        onOpenChange={() => setDeleteBookingId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Booking?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              booking and all associated measurement data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
