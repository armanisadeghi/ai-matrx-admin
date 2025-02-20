// Creating your own custom search bar
import React, { useState } from "react";
import { ShoppingCart, Search, Tag, MapPin, Filter, Shirt } from "lucide-react";
import SearchBarContainer from "../SearchBarContainer";
import SearchField from "../SearchField";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Slider } from "@/components/ui/slider";
import SearchCommandField from "../reusable/SearchCommandField";
import { GiDress } from "react-icons/gi";
import { PiPants, PiSneaker } from "react-icons/pi";
import { TbJacket } from "react-icons/tb";
import { CiDiscount1 } from "react-icons/ci";
import { IoBag } from "react-icons/io5";
import ButtonSearchField from "../reusable/ButtonSearchField";

const clothingGroups = [
  {
    brokerId: "2a53fd15-acb5-42dc-9169-e79e6eb95eb4",
    heading: "Categories",
      items: [
          { label: "T-shirts & Tops", value: "tshirts-tops", icon: <Tag size={16} /> },
          { label: "Dresses", value: "dresses", icon: <GiDress size={16} /> },
          { label: "Jeans & Pants", value: "jeans-pants", icon: <PiPants size={16} /> },
          { label: "Shirts", value: "shirts", icon: <Shirt size={16} /> },
          { label: "Jackets", value: "jackets", icon: <TbJacket size={16} /> },
          { label: "Shoes", value: "shoes", icon: <PiSneaker size={16} /> },
          { label: "Accessories", value: "accessories", icon: <IoBag size={16} /> },
          { label: "Sale", value: "sale", icon: <CiDiscount1 size={16} /> },
          { label: "New", value: "new", icon: <Tag size={16} /> },
      ],
  },
];

const sizes = ["XS", "S", "M", "L", "XL", "XXL"];




export const ShoppingSearchBar = () => {
    const [searchFocus, setSearchFocus] = useState(null);

    console.log("searchFocus", searchFocus);


    // Step 1: Define the content for each tab
    const clothingContent = (
        <div className="flex w-full">
            <SearchCommandField
                id="2a53fd15-acb5-42dc-9169-e79e6eb95eb4"
                label="What"
                placeholder="Search clothing items"
                inputPlaceholder="T-shirts, jeans, dresses..."
                groups={clothingGroups}
                onSelect={(value, groupHeading) => {
                    console.log(`Selected ${value} from ${groupHeading}`);
                }}
            />

            {/* Size selector with internal state management */}
            <ButtonSearchField
                id="2a9a3e13-1666-4e8d-bba8-780f93edada5"
                label="Size"
                placeholder="Select size"
                title="Choose a size"
                values={sizes}
                onSelect={(size) => {
                    console.log(`Selected size: ${size}`);
                }}
            />


            <SearchField
                id="specific-measurements"
                label="Specific measurements"
                placeholder="Select measurements"
                isActive={searchFocus === "specific-measurements"}
                onClick={setSearchFocus}
                onOpenChange={setSearchFocus}
            >
                <div className="p-4 w-64">
                    <h4 className="text-sm font-medium mb-2">Specific measurements</h4>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-xs text-gray-500">Chest (in)</label>
                            <input
                                type="number"
                                className="w-full mt-1 p-2 rounded-md border dark:border-gray-700 bg-white dark:bg-gray-800"
                                placeholder="inches"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500">Waist (in)</label>
                            <input
                                type="number"
                                className="w-full mt-1 p-2 rounded-md border dark:border-gray-700 bg-white dark:bg-gray-800"
                                placeholder="inches"
                            />
                        </div>
                    </div>
                </div>
            </SearchField>

            <SearchField
                id="price-clothing"
                label="Price"
                placeholder="Set budget"
                isActive={searchFocus === "price-clothing"}
                onClick={setSearchFocus}
                onOpenChange={setSearchFocus}
            >
                <div className="p-4 w-80">
                    <h3 className="font-medium mb-4 text-gray-800 dark:text-gray-200">Price range</h3>
                    <div className="px-2">
                        <Slider defaultValue={[0, 100]} max={200} step={1} />
                    </div>
                    <div className="flex justify-between mt-6">
                        <div>
                            <label className="text-xs text-gray-500 block">Min price</label>
                            <div className="mt-1 relative">
                                <span className="absolute left-3 top-2 text-gray-500">$</span>
                                <input
                                    type="number"
                                    className="pl-7 p-2 w-24 rounded-md border dark:border-gray-700 bg-white dark:bg-gray-800"
                                    placeholder="0"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 block">Max price</label>
                            <div className="mt-1 relative">
                                <span className="absolute left-3 top-2 text-gray-500">$</span>
                                <input
                                    type="number"
                                    className="pl-7 p-2 w-24 rounded-md border dark:border-gray-700 bg-white dark:bg-gray-800"
                                    placeholder="200"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </SearchField>

            <SearchField
                id="where-clothing"
                label="Where"
                placeholder="Delivery location"
                isActive={searchFocus === "where-clothing"}
                onClick={setSearchFocus}
                onOpenChange={setSearchFocus}
                isLast={true}
                actionButton={
                    <div className="bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white rounded-full p-3 ml-2">
                        <Search size={16} />
                    </div>
                }
            >
                <div className="p-4 w-80">
                    <div className="mb-4">
                        <h3 className="font-medium text-gray-800 dark:text-gray-200">Delivery options</h3>
                        <p className="text-sm text-gray-500">Choose where you want your items delivered</p>
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-start gap-3 p-3 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
                            <MapPin size={18} className="mt-1 text-emerald-500" />
                            <div>
                                <h4 className="font-medium">Current location</h4>
                                <p className="text-sm text-gray-500">Using your device location</p>
                            </div>
                        </div>
                        <div className="relative">
                            <input
                                type="text"
                                className="w-full p-2 pl-9 rounded-md border dark:border-gray-700 bg-white dark:bg-gray-800"
                                placeholder="Enter zip code or address"
                            />
                            <MapPin size={16} className="absolute left-2.5 top-2.5 text-gray-400" />
                        </div>
                        <div className="mt-3 space-y-2">
                            <label className="flex items-center gap-2">
                                <input type="checkbox" className="rounded border-gray-300 dark:border-gray-600" />
                                <span className="text-sm">Show only stores with pickup available</span>
                            </label>
                            <label className="flex items-center gap-2">
                                <input type="checkbox" className="rounded border-gray-300 dark:border-gray-600" />
                                <span className="text-sm">Same-day delivery only</span>
                            </label>
                        </div>
                    </div>
                </div>
            </SearchField>
        </div>
    );

    const electronicsContent = (
        <div className="flex w-full">
            <SearchField
                id="what-electronics"
                label="Product"
                placeholder="Search electronics"
                isActive={searchFocus === "what-electronics"}
                onClick={setSearchFocus}
                onOpenChange={setSearchFocus}
            >
                <Command className="rounded-lg border-none w-96">
                    <CommandInput placeholder="Phones, laptops, cameras..." />
                    <CommandList>
                        <CommandEmpty>No products found.</CommandEmpty>
                        <CommandGroup heading="Categories">
                            <CommandItem className="py-2">
                                <div className="flex items-center gap-3">
                                    <Tag size={16} />
                                    <span>Smartphones & Accessories</span>
                                </div>
                            </CommandItem>
                            <CommandItem className="py-2">
                                <div className="flex items-center gap-3">
                                    <Tag size={16} />
                                    <span>Laptops & Computers</span>
                                </div>
                            </CommandItem>
                            <CommandItem className="py-2">
                                <div className="flex items-center gap-3">
                                    <Tag size={16} />
                                    <span>TVs & Home Entertainment</span>
                                </div>
                            </CommandItem>
                        </CommandGroup>
                    </CommandList>
                </Command>
            </SearchField>

            <SearchField
                id="specs-electronics"
                label="Specs"
                placeholder="Filter specifications"
                isActive={searchFocus === "specs-electronics"}
                onClick={setSearchFocus}
                onOpenChange={setSearchFocus}
            >
                <div className="p-4 w-80">
                    <h3 className="font-medium mb-3 text-gray-800 dark:text-gray-200">Technical specifications</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium block mb-2">Brand</label>
                            <div className="grid grid-cols-2 gap-2">
                                {["Apple", "Samsung", "Sony", "LG", "Dell", "HP"].map((brand) => (
                                    <label key={brand} className="flex items-center gap-2">
                                        <input type="checkbox" className="rounded border-gray-300 dark:border-gray-600" />
                                        <span className="text-sm">{brand}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-medium block mb-2">Storage</label>
                            <div className="grid grid-cols-3 gap-2">
                                {["64GB", "128GB", "256GB", "512GB", "1TB", "2TB"].map((storage) => (
                                    <button
                                        key={storage}
                                        className="py-1 px-2 text-sm border rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 dark:border-gray-700"
                                    >
                                        {storage}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </SearchField>

            <SearchField
                id="price-electronics"
                label="Price"
                placeholder="Set budget"
                isActive={searchFocus === "price-electronics"}
                onClick={setSearchFocus}
                onOpenChange={setSearchFocus}
            >
                <div className="p-4 w-80">
                    <h3 className="font-medium mb-4 text-gray-800 dark:text-gray-200">Price range</h3>
                    <div className="px-2">
                        <Slider defaultValue={[0, 1000]} max={2000} step={50} />
                    </div>
                    <div className="flex justify-between mt-6">
                        <div>
                            <label className="text-xs text-gray-500 block">Min price</label>
                            <div className="mt-1 relative">
                                <span className="absolute left-3 top-2 text-gray-500">$</span>
                                <input
                                    type="number"
                                    className="pl-7 p-2 w-24 rounded-md border dark:border-gray-700 bg-white dark:bg-gray-800"
                                    placeholder="0"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 block">Max price</label>
                            <div className="mt-1 relative">
                                <span className="absolute left-3 top-2 text-gray-500">$</span>
                                <input
                                    type="number"
                                    className="pl-7 p-2 w-24 rounded-md border dark:border-gray-700 bg-white dark:bg-gray-800"
                                    placeholder="2000"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </SearchField>

            <SearchField
                id="availability-electronics"
                label="Availability"
                placeholder="Delivery & pickup"
                isActive={searchFocus === "availability-electronics"}
                onClick={setSearchFocus}
                onOpenChange={setSearchFocus}
                isLast={true}
                actionButton={
                    <div className="bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white rounded-full p-3 ml-2">
                        <Search size={16} />
                    </div>
                }
            >
                <div className="p-4 w-80">
                    <div className="mb-4">
                        <h3 className="font-medium text-gray-800 dark:text-gray-200">Availability options</h3>
                        <p className="text-sm text-gray-500">Filter by availability</p>
                    </div>
                    <div className="space-y-3">
                        <label className="flex items-center gap-2">
                            <input type="radio" name="availability" className="rounded-full border-gray-300 dark:border-gray-600" />
                            <span className="text-sm">All items</span>
                        </label>
                        <label className="flex items-center gap-2">
                            <input type="radio" name="availability" className="rounded-full border-gray-300 dark:border-gray-600" />
                            <span className="text-sm">In stock only</span>
                        </label>
                        <label className="flex items-center gap-2">
                            <input type="radio" name="availability" className="rounded-full border-gray-300 dark:border-gray-600" />
                            <span className="text-sm">Ready for pickup today</span>
                        </label>
                        <label className="flex items-center gap-2">
                            <input type="radio" name="availability" className="rounded-full border-gray-300 dark:border-gray-600" />
                            <span className="text-sm">Same-day delivery available</span>
                        </label>
                    </div>
                </div>
            </SearchField>
        </div>
    );

    // Step 2: Define tab configuration
    const shoppingTabs = [
        {
            id: "clothing",
            label: "Clothing",
            content: clothingContent,
        },
        {
            id: "electronics",
            label: "Electronics",
            content: electronicsContent,
        },
        {
            id: "home",
            label: "Home & Garden",
            content: clothingContent, // Reusing for demo, you would create unique content
        },
        {
            id: "toys",
            label: "Toys & Games",
            content: electronicsContent, // Reusing for demo, you would create unique content
        },
    ];

    // Step 3: Create custom right navigation if needed
    const shoppingRightNav = (
        <div className="flex items-center gap-4">
            <button className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                <ShoppingCart size={20} className="text-gray-700 dark:text-gray-300" />
                <span className="absolute top-0 right-0 h-4 w-4 text-xs flex items-center justify-center bg-emerald-500 text-white rounded-full">
                    3
                </span>
            </button>
            <button className="hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full p-2">
                <Filter size={20} className="text-gray-700 dark:text-gray-300" />
            </button>
            <button className="bg-emerald-500 hover:bg-emerald-600 px-4 py-2 rounded-full text-white text-sm font-medium">Sign In</button>
        </div>
    );

    // Step 4: Create the component
    return (
        <SearchBarContainer
            tabs={shoppingTabs}
            logo={<ShoppingCart size={32} className="text-emerald-500 dark:text-emerald-400" />}
            defaultTab="clothing"
            rightNav={shoppingRightNav}
            onTabChange={() => {}}
        />
    );
};

export default ShoppingSearchBar;
