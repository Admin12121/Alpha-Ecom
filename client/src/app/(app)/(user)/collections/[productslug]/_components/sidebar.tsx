"use client";

import * as z from "zod";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { useRouter } from "nextjs-toploader/app";
import { useCart } from "@/lib/cart-context";
import { ReviewSheet } from "./review-sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Separator as Divider } from "@/components/ui/separator";
import {
  Card,
  CardContent as CardBody,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";

import {
  Box as FiBox,
  Star as MdOutlineStar,
  OctagonAlert as PiWarningOctagon,
} from "lucide-react";

import {
  useNotifyuserMutation,
  useGetnotifyuserQuery,
} from "@/lib/store/Service/api";
import { useAuthUser } from "@/hooks/use-auth-user";
import { cn } from "@/lib/utils";
import StockWarningMessage from "./stock-warning";
import WishList from "@/components/global/wishlist-button";
import { encryptData } from "@/lib/transition";
import { parseDescription } from "@/lib/parse-decsription";
import { renderUI } from "./description-automation";
import WriteReview from "./write-review";
import { delay } from "@/lib/utils";

const EmailSchema = z.object({
  email: z.string().min(1, { message: "UID is required" }),
});

interface VariantObject {
  id: number;
  color?: string | null;
  color_code?: string | null;
  color_name?: string | null;
  size: string | null;
  price: string;
  discount: string;
  stock: number;
  product: number;
}

interface Product {
  id: number;
  categoryname: string;
  subcategoryname: string;
  comments: any[];
  rating: number;
  total_ratings: number;
  product_name: string;
  description: string;
  productslug: string;
  category: number;
  subcategory: number;
  variants: VariantObject | VariantObject[];
  images: any[];
}

export const getSizeCategory = (index: number) => {
  const sizeNames = [
    "Small",
    "Medium",
    "Large",
    "X-Large",
    "XX-Large",
    "XXX-Large",
  ];
  return sizeNames[index] || `Size-${index + 1}`;
};

const Sidebar = ({ products }: { products: Product }) => {
  const router = useRouter();
  const { status } = useAuthUser();
  const { updateProductList } = useCart();

  const [selectedSize, setSelectedSize] = useState<{
    id: number;
    size: string | null;
  } | null>(null);
  const [selectedColor, setSelectedColor] = useState<{
    code: string;
    name: string;
  } | null>(null);
  const [variantsData, setVariantsData] = useState<
    VariantObject[] | VariantObject | null
  >(null);

  const [selectedVariantOutOfStock, setSelectedVariantOutOfStock] =
    useState<boolean>(false);
  const [outOfStock, setOutOfStock] = useState<boolean>(false);
  const [selectedVariant, setSelectedVariant] = useState<number | null>(null);

  const sortedVariants = Array.isArray(variantsData)
    ? [...variantsData].sort((a, b) => Number(a.size) - Number(b.size))
    : [];

  const uniqueColors = useMemo(() => {
    if (!Array.isArray(variantsData)) return [];
    const colorMap = new Map<string, { code: string; name: string }>();
    variantsData.forEach((variant) => {
      if (variant.color_code && variant.color_name) {
        colorMap.set(variant.color_code, {
          code: variant.color_code,
          name: variant.color_name,
        });
      }
    });
    return Array.from(colorMap.values());
  }, [variantsData]);

  useEffect(() => {
    if (products?.variants) {
      setVariantsData(products.variants);
      if (!Array.isArray(products.variants)) {
        setSelectedSize({
          id: products.variants.id,
          size: products.variants.size,
        });
      }
    }
  }, [products]);

  useEffect(() => {
    if (products?.variants && Array.isArray(products.variants)) {
      const variants = products.variants;
      const sortedVariants = [...variants].sort(
        (a, b) => Number(a.size) - Number(b.size)
      );
      setVariantsData(sortedVariants);
      if (sortedVariants.length > 0) {
        setSelectedSize({
          id: sortedVariants[0].id,
          size: sortedVariants[0].size,
        });
        if (sortedVariants[0].color_code && sortedVariants[0].color_name) {
          setSelectedColor({
            code: sortedVariants[0].color_code,
            name: sortedVariants[0].color_name,
          });
        }
      }
      const anyOutOfStock = sortedVariants.some(
        (variant) => variant.stock === 0
      );
      setOutOfStock(anyOutOfStock);
    }
  }, [products]);

  useEffect(() => {
    if (Array.isArray(variantsData)) {
      const selectedVariant = variantsData.find(
        (variant) => {
          const sizeMatch = selectedSize ? variant.id === selectedSize.id : !variant.size;
          const colorMatch = selectedColor ? variant.color_code === selectedColor.code : !variant.color_code;
          return sizeMatch && colorMatch;
        }
      );
      
      if (selectedVariant) {
        setSelectedVariant(selectedVariant.id);
        setSelectedVariantOutOfStock(selectedVariant.stock === 0);
      }
    } else if (variantsData) {
      setSelectedVariantOutOfStock(variantsData.stock === 0);
    }
  }, [selectedSize, selectedColor, variantsData]);

  const getVariantData = useCallback(
    (
      variantsData: VariantObject[] | VariantObject | null,
      key: keyof VariantObject,
      index: number = 0
    ): any => {
      if (Array.isArray(variantsData)) {
        const variant = variantsData.find((variant) => variant.id === index);
        return variant ? variant[key] : null;
      } else if (variantsData) {
        return variantsData[key];
      }
      return null;
    },
    []
  );

  const convertedPrice = getVariantData(
    variantsData,
    "price",
    selectedSize?.id
  );
  const discount = getVariantData(variantsData, "discount", selectedSize?.id);
  const stock = getVariantData(variantsData, "stock", selectedSize?.id);
  const finalPrice = useMemo(() => {
    return Number(
      (convertedPrice - convertedPrice * (discount / 100)).toFixed(2)
    );
  }, [convertedPrice, discount]);

  const handleRoute = () => {
    router.push(`/collections?category=${products?.categoryname}`);
  };

  const handleAddToCart = () =>
    updateProductList({
      product: products.id,
      variant: getVariantData(variantsData, "id", selectedSize?.id),
    });

  const handleenc = () => {
    if (status) {
      const data = [
        {
          product: products?.id,
          variant: getVariantData(variantsData, "id", selectedSize?.id),
          pcs: 1,
        },
      ];
      encryptData(data, router);
    } else {
      router.push(`/login`);
    }
  };
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
    });
  };
  const calculateEstimatedArrival = (): string => {
    const today = new Date();
    const weekAhead = new Date(today);
    weekAhead.setDate(today.getDate() + 7);
    const tenDaysAhead = new Date(today);
    tenDaysAhead.setDate(today.getDate() + 10);
    return `${formatDate(weekAhead)} - ${formatDate(tenDaysAhead)}`;
  };
  const arrivalDate = calculateEstimatedArrival();
  const description = parseDescription(products.description);
  return (
    <>
      <aside className="sidebar  w-full sticky top-[65px] space-y-8 ">
        {selectedVariantOutOfStock ? (
          <StockWarningMessage message="This item is out of stock" />
        ) : stock > 0 && stock < 5 ? (
          <StockWarningMessage message="Few items left in stock!" />
        ) : null}
        <Card className=" w-full !bg-transparent border-none border-0 shadow-none p-0 pt-3">
          <CardHeader className="flex flex-row gap-3 justify-between items-center px-4">
            <div className="flex gap-3 items-center">
              <div className="flex flex-col">
                <p className="text-2xl font-medium">{products?.product_name}</p>
                <p
                  className="text-sm text-neutral-600 cursor-pointer"
                  onClick={handleRoute}
                >
                  {products?.categoryname}
                </p>
              </div>
            </div>
            <WishList productId={products.id} />
          </CardHeader>
          <CardBody className="flex flex-col p-4 gap-5 flex-initial ">
            {Array.isArray(variantsData) && (
              <>
                <span className="flex gap-3 flex-col">
                  <p className="text-sm">Statue Size</p>
                  <span className="flex gap-2 items-center">
                    {sortedVariants.map((variant, index) => (
                      <Button
                        key={variant.id}
                        variant={
                          selectedSize?.id === variant.id
                            ? "active"
                            : "secondary"
                        }
                        size="sm"
                        onClick={() =>
                          setSelectedSize({
                            id: variant.id,
                            size: variant.size,
                          })
                        }
                      >
                        {getSizeCategory(index)}
                      </Button>
                    ))}
                  </span>
                </span>
                {uniqueColors.length > 0 && (
                  <span className="flex gap-3 flex-col">
                    <p className="text-sm">Color</p>
                    <span className="flex gap-2 items-center flex-wrap">
                      {uniqueColors.map((color) => (
                        <button
                          key={color.code}
                          type="button"
                          onClick={() => setSelectedColor(color)}
                          className={cn(
                            "w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all",
                            selectedColor?.code === color.code
                              ? "border-neutral-900 dark:border-neutral-100 ring-2 ring-offset-2 ring-neutral-900 dark:ring-neutral-100"
                              : "border-neutral-300 dark:border-neutral-700 hover:border-neutral-500"
                          )}
                          style={{ backgroundColor: color.code }}
                          title={color.name}
                          aria-label={`Select ${color.name} color`}
                        >
                          {selectedColor?.code === color.code && (
                            <svg
                              className="w-5 h-5"
                              style={{
                                color:
                                  parseInt(color.code.slice(1), 16) > 0xffffff / 2
                                    ? "#000000"
                                    : "#ffffff",
                              }}
                              fill="none"
                              strokeWidth={3}
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </button>
                      ))}
                    </span>
                  </span>
                )}
                <Card className="w-full mt-5 rounded-md bg-white dark:bg-neutral-900 border-none shadow-none p-3">
                  <CardBody>
                    <p className="text-sm text-zinc-400">Details</p>
                    <Divider className="my-1" />
                    {selectedSize && (
                      <span className="flex justify-between items-center">
                        <p className="text-xs text-zinc-400">Statue Size</p>
                        <p className="text-xs text-zinc-400">
                          {selectedSize?.size} cm
                        </p>
                      </span>
                    )}
                    {selectedColor && (
                      <span className="flex justify-between items-center mt-1">
                        <p className="text-xs text-zinc-400">Color</p>
                        <span className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded-full border border-neutral-300 dark:border-neutral-700"
                            style={{ backgroundColor: selectedColor.code }}
                          />
                          <p className="text-xs text-zinc-400">
                            {selectedColor.name}
                          </p>
                        </span>
                      </span>
                    )}
                  </CardBody>
                </Card>
              </>
            )}
            {stock > 0 && stock < 5 && (
              <span className="flex items-center gap-2 text-sm font-extralight">
                <PiWarningOctagon className="w-4 h-4" /> {stock} items left
              </span>
            )}
            <span className="w-full flex gap-5 items-center">
              <span className="text-xs text-zinc-400 flex gap-2">
                <FiBox size={16} /> Delivery on {arrivalDate}
              </span>
            </span>
            <span className="w-full flex gap-3 items-center">
              <span className="flex gap-2">
                <p className="text-lg">
                  {discount > 0 && `रु ${finalPrice}`}
                </p>
                <p
                  className={cn(
                    "text-lg",
                    discount > 0 && "text-neutral-500 line-through"
                  )}
                >
                  रु {convertedPrice}
                </p>
              </span>
            </span>
            {!selectedVariantOutOfStock ? (
              <span className="flex gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full h-[40px] text-base"
                  onClick={handleAddToCart}
                >
                  Add to Cart
                </Button>
                {status && (
                  <Button
                    variant="active"
                    className="w-full h-[40px] text-base"
                    onClick={handleenc}
                  >
                    Buy now
                  </Button>
                )}
              </span>
            ) : (
              <>
                {selectedSize && (
                  <NotifyForm
                    product={products.id}
                    stock={stock}
                    selectedVariant={selectedSize.id}
                  />
                )}
              </>
            )}
          </CardBody>
          <CardFooter className="gap-5 flex flex-col pb-0">
            <span className="w-full p-0">
              <Card className="w-full border-none border-0 bg-white dark:bg-neutral-950 p-0">
                <CardHeader className="flex gap-3 p-3">
                  <div className="w-full flex justify-between items-center px-1">
                    <p className="text-md">Reviews({products.total_ratings})</p>
                    <WriteReview link={true} product={products} />
                  </div>
                </CardHeader>
                <CardBody className="gap-3 p-3 flex flex-col">
                  <div className="w-full flex justify-between items-center px-1">
                    <p className="text-xs">Overall rating</p>
                    <p className="text-xs flex gap-1 items-center">
                      {products.rating}{" "}
                      <MdOutlineStar color="orange" size={16} />
                    </p>
                  </div>
                  <ReviewSheet
                    rating={products.rating}
                    slug={products.productslug}
                    product={products}
                  />
                </CardBody>
              </Card>
              {description && renderUI(description)}
            </span>
          </CardFooter>
        </Card>
      </aside>
    </>
  );
};

interface NotifyFormProps {
  product: number;
  selectedVariant: number;
  stock: number;
}

const NotifyForm = ({ product, selectedVariant, stock }: NotifyFormProps) => {
  const { accessToken } = useAuthUser();
  const [notifyuser] = useNotifyuserMutation();
  const [notifyadded, setNotifyAdded] = useState<boolean>(false);
  const { data: Notify, isLoading: loading } = useGetnotifyuserQuery(
    { product: product, variant: selectedVariant, token: accessToken },
    { skip: !product || !selectedVariant || stock !== 0 }
  );
  useEffect(() => {
    setNotifyAdded(Notify?.requested || false);
  }, [Notify]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm({
    resolver: zodResolver(EmailSchema),
  });

  const emailValue = watch("email", "");

  const onSubmit = async (data: any) => {
    const toastId = toast.loading("Adding to waiting list...", {
      position: "top-center",
    });
    const actualData = {
      ...data,
      variant: selectedVariant,
      product: product,
    };
    await delay(500);
    const res = await notifyuser({ actualData, token: accessToken });
    if (res.data) {
      toast.success("Added to waiting list", {
        id: toastId,
        position: "top-center",
      });
    }
    if (res.error) {
      toast.error("Something went wrong, try again later", {
        id: toastId,
        position: "top-center",
      });
    }
  };

  if (loading) {
    return (
      <span className="flex w-full h-[185px] items-center justify-center">
        <Spinner color="default" />
      </span>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className=" flex flex-col gap-2 py-5"
    >
      <span>
        <h1 className="text-xl font-medium text-neutral-600 dark:text-zinc-300">
          This item is out of stock!
        </h1>
        <p className="text-sm text-zinc-400">
          Enter your email and we&apos;ll notify you when it&apos;s back in
          stock
        </p>
      </span>
      <Input
        {...register("email")}
        type="email"
        placeholder={
          notifyadded ? "You will be notify soon!!" : "Enter your email"
        }
        className={cn(
          "dark:bg-custom/40 border-0 bg-white outline-none focus:ring-0 focus:border-transparent",
          notifyadded && "border-ring ring-2 ring-orange-400/50 ring-offset-2"
        )}
        disabled={notifyadded}
      />
      <span className="flex gap-2">
        <Button
          color="default"
          variant="custom"
          className={cn(
            "w-full h-[40px] text-base disabled:cursor-not-allowed"
          )}
          type="submit"
          disabled={notifyadded || !emailValue || !!errors.email}
        >
          Notify me when available
        </Button>
        <WishList productId={product} custom={false} />
      </span>
    </form>
  );
};

export default Sidebar;
