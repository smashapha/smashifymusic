const fs = require('fs');
let code = fs.readFileSync('src/pages/Pricing.tsx', 'utf8');

// I can see the Pricing page ALREADY has an activeTab switcher between 'listeners' and 'artists'!
// Wait, the user said: "Artists open /pricing and see fan plans. Fix: auto-detect role -> show the right plan set"

// I need to update the initial state of activeTab based on the user's role if it's not set in the URL.
// The issue is it defaults to 'listeners':
// const [activeTab, setActiveTab] = useState<'listeners' | 'artists'>((searchParams.get('tab') as 'listeners' | 'artists') || 'listeners');
// I need to use the auth context to determine the default.

// First, read the useAuth call which is currently:
// const { user, userProfile, refreshProfile } = useAuth();
// It's after the useState. We need to move it up or use it for initialization.
// Better yet, in the useEffect, if there's no tab in the URL, set it based on the user's role.

const replacement = `
  const { user, userProfile, role, refreshProfile } = useAuth();
  
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'listeners' | 'artists'>('listeners');
  const [expectedTips, setExpectedTips] = useState<number>(50000);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'artists' || tab === 'listeners') {
      setActiveTab(tab);
    } else if (role === 'artist' || role === 'admin') {
      setActiveTab('artists');
    } else {
      setActiveTab('listeners');
    }
  }, [searchParams, role]);
`;

code = code.replace(
  `const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'listeners' | 'artists'>((searchParams.get('tab') as 'listeners' | 'artists') || 'listeners');
  const [expectedTips, setExpectedTips] = useState<number>(50000);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'artists' || tab === 'listeners') {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (tab: 'listeners' | 'artists') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const { user, userProfile, refreshProfile } = useAuth();`,
  replacement + `
  const handleTabChange = (tab: 'listeners' | 'artists') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };`
);

fs.writeFileSync('src/pages/Pricing.tsx', code);
console.log("Patched Pricing.tsx");
