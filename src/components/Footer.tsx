import React from 'react';
import { motion } from 'motion/react';

interface FooterProps {
  primaryColor?: string;
}

export default function Footer({ primaryColor }: FooterProps) {
  const brandColor = primaryColor || '#865d39';

  return (
    <footer className="w-full py-8 flex flex-col items-center justify-center gap-2 mt-auto">
      <p className="text-[10px] tracking-[0.2em] font-sans font-bold text-black/50 uppercase">
        DESENVOLVIDO POR
      </p>
      <a 
        href="https://www.easybyzcreator.com" 
        target="_blank" 
        rel="noopener noreferrer"
        className="group inline-flex items-center justify-center cursor-pointer"
        title="Easy Byz Creator"
      >
        <motion.div 
          role="img"
          aria-label="Easy Byz Creator Logo"
          className="h-28 w-28 sm:h-32 sm:w-32"
          style={{ 
            backgroundColor: brandColor,
            WebkitMaskImage: 'url("/assets/easybyz_logo.png")',
            maskImage: 'url("/assets/easybyz_logo.png")',
            WebkitMaskRepeat: 'no-repeat',
            maskRepeat: 'no-repeat',
            WebkitMaskPosition: 'center',
            maskPosition: 'center',
            WebkitMaskSize: 'contain',
            maskSize: 'contain',
          }}
          initial={{ 
            opacity: 0.9,
            scale: 0.95
          }}
          whileHover={{ 
            opacity: 1,
            scale: 1.05
          }}
          whileTap={{ scale: 0.95 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      </a>
    </footer>
  );
}
