import React, { useState } from 'react';
import { ArrowRight, Box } from 'lucide-react';
import { CraftingRecipe as CraftingRecipeType } from '@/lib/types';
import Image from 'next/image';

interface CraftingRecipeProps {
    recipe: CraftingRecipeType;
}

export default function CraftingRecipe({ recipe }: CraftingRecipeProps) {
    const { slots, outputItem, outputAmount } = recipe;

    // Helper to get image path from item name
    const getImagePath = (itemName: string) => {
        if (!itemName || itemName.toLowerCase() === 'air') return null;
        // Convert "Iron Ingot" -> "iron_ingot.png"
        const filename = itemName.toLowerCase().replace(/\s+/g, '_') + '.png';
        return `/assets/Transparent-Images/${filename}`;
    };

    return (
        <div className="mt-4 mb-2 p-4 bg-zinc-900/80 rounded-xl border border-white/10 max-w-fit mx-auto">
            <div className="flex items-center gap-6">
                {/* 3x3 Grid */}
                <div className="grid grid-cols-3 gap-1 bg-[#8B8B8B] p-1 rounded border-2 border-[#373737] shadow-inner">
                    {slots.map((item, index) => (
                        <CraftingSlot key={index} itemName={item} getImagePath={getImagePath} />
                    ))}
                </div>

                {/* Arrow */}
                <div className="text-zinc-400">
                    <ArrowRight size={32} />
                </div>

                {/* Output Slot */}
                <div className="bg-[#8B8B8B] p-1 rounded border-2 border-[#373737] shadow-inner">
                    <div className="relative w-16 h-16 bg-[#8B8B8B] flex items-center justify-center">
                        <CraftingSlotContent itemName={outputItem} getImagePath={getImagePath} size={48} />
                        {outputAmount > 1 && (
                            <span className="absolute bottom-0 right-1 text-white font-bold drop-shadow-md select-none text-lg">
                                {outputAmount}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="text-center mt-3 text-sm text-gray-400 font-medium">
                {outputItem}
            </div>
        </div>
    );
}

// Sub-component for a single slot (16x16 pixels scaled up)
function CraftingSlot({ itemName, getImagePath }: { itemName: string, getImagePath: (name: string) => string | null }) {
    const isAir = !itemName || itemName.toLowerCase() === 'air';

    return (
        <div className="w-10 h-10 bg-[#8B8B8B] hover:bg-[#9B9B9B] border-t-2 border-l-2 border-[#373737] border-b-white/10 border-r-white/10 transition-colors flex items-center justify-center relative group">
            {!isAir && (
                <>
                    <CraftingSlotContent itemName={itemName} getImagePath={getImagePath} size={32} />
                    {/* Tooltip */}
                    <div className="absolute opacity-0 group-hover:opacity-100 bottom-full mb-1 left-1/2 -translate-x-1/2 bg-black/90 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-10 pointer-events-none transition-opacity">
                        {itemName}
                    </div>
                </>
            )}
        </div>
    );
}

// Helper to render image with fallback
function CraftingSlotContent({ itemName, getImagePath, size }: { itemName: string, getImagePath: (name: string) => string | null, size: number }) {
    const [error, setError] = useState(false);
    const imagePath = getImagePath(itemName);

    if (error || !imagePath) {
        // Fallback icon
        return <Box className="text-zinc-600 opacity-50" size={size * 0.6} />;
    }

    return (
        <Image
            src={imagePath}
            alt={itemName}
            width={size}
            height={size}
            className="pixelated object-contain"
            onError={() => setError(true)}
            unoptimized // For local assets sometimes needed
        />
    );
}
