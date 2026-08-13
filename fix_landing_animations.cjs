const fs = require('fs');
let code = fs.readFileSync('src/pages/Landing.tsx', 'utf8');

// We need to add `const isLowEnd = (navigator.deviceMemory || 4) <= 2;`
// `const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;`

if (!code.includes('isLowEnd')) {
  code = code.replace(
    "export default function Landing() {",
    "export default function Landing() {\n  const isLowEnd = typeof navigator !== 'undefined' && ((navigator.deviceMemory || 4) <= 2 || window.innerWidth < 768);\n  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;\n  const disableAnimations = isLowEnd || prefersReducedMotion;"
  );

  // Replace floating avatars logic:
  // if disableAnimations is true, don't animate or only render static
  code = code.replace(
    /<motion\.div\s+key={i}\s+initial={{ y: 0 }}\s+animate={{ y: \[-20, 20, -20\] }}\s+transition={{\s+duration: 3 \+ \(i % 3\),\s+repeat: Infinity,\s+ease: "easeInOut",\s+delay: i \* 0\.2\s+}}/g,
    "<motion.div key={i} initial={{ y: 0 }} animate={disableAnimations ? {} : { y: [-20, 20, -20] }} transition={{ duration: 3 + (i % 3), repeat: Infinity, ease: 'easeInOut', delay: i * 0.2 }}"
  );

  // Background blur issue
  code = code.replace(/backdrop-blur-\[100px\]/g, "${isLowEnd ? 'bg-bg-page/95' : 'backdrop-blur-[100px]'}");
  code = code.replace(/blur-\[120px\]/g, "${isLowEnd ? 'hidden' : 'blur-[120px]'}");
  code = code.replace(/blur-\[80px\]/g, "${isLowEnd ? 'hidden' : 'blur-[80px]'}");
  code = code.replace(/blur-\[60px\]/g, "${isLowEnd ? 'hidden' : 'blur-[60px]'}");

  // Marquee
  code = code.replace(
    /animate={{ x: \["0%", "-50%"\] }}/g,
    "animate={disableAnimations ? {} : { x: ['0%', '-50%'] }}"
  );

  // Make sure we interpolate template strings if we replaced normal strings
  code = code.replace(/className="absolute z-0 w-\[150vw\] h-\[150vh\] bg-smash-purple\/20 \${isLowEnd \? 'hidden' : 'blur-\[120px\]'} rounded-full"/g, "className={`absolute z-0 w-[150vw] h-[150vh] bg-smash-purple/20 ${isLowEnd ? 'hidden' : 'blur-[120px]'} rounded-full`}");
  code = code.replace(/className="absolute top-1\/4 right-1\/4 w-96 h-96 bg-smash-orange\/10 \${isLowEnd \? 'hidden' : 'blur-\[80px\]'} rounded-full mix-blend-screen"/g, "className={`absolute top-1/4 right-1/4 w-96 h-96 bg-smash-orange/10 ${isLowEnd ? 'hidden' : 'blur-[80px]'} rounded-full mix-blend-screen`}");
  code = code.replace(/className="absolute bottom-1\/4 left-1\/4 w-96 h-96 bg-smash-purple\/10 \${isLowEnd \? 'hidden' : 'blur-\[80px\]'} rounded-full mix-blend-screen"/g, "className={`absolute bottom-1/4 left-1/4 w-96 h-96 bg-smash-purple/10 ${isLowEnd ? 'hidden' : 'blur-[80px]'} rounded-full mix-blend-screen`}");

  fs.writeFileSync('src/pages/Landing.tsx', code);
}
