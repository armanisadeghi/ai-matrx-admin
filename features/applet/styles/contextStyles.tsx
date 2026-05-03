import { 
    Building2, Plane, Utensils, Compass, 
    ShoppingBag, Car, Train, Bus,
    Home, Briefcase, Users, Heart,
    Stethoscope, Music, Camera, Gamepad2,
    Book, Palette, Film, Trophy,
    DollarSign, Landmark, ShoppingCart, Package,
    MapPin, Bike, Ship, Anchor,
    Coffee, Wine, Pizza, Cake,
    Dumbbell, Trees, Mountain,
    Laptop, Smartphone, Wifi, Shield,
    GraduationCap, Wrench, Globe, Store,
    Calendar, Clock, Mail, Phone,
    Headphones, Tv, Star, Ticket,
    Bed, Bath, Sofa, Lightbulb,
    MousePointerClick, Gift, PartyPopper, Sun
} from "lucide-react";
import { TbBeach } from "react-icons/tb";

export const contextStyles = {
    // Travel & Transportation
    hotels: {
        fallbackBg: "linear-gradient(to right, #0f2027, #203a43, #2c5364)",
        icon: <Building2 size={24} />,
    },
    flights: {
        fallbackBg: "linear-gradient(to right, #2c3e50, #4ca1af)",
        icon: <Plane size={24} />,
    },
    carRental: {
        fallbackBg: "linear-gradient(to right, #3D7EAA, #FFE47A)",
        icon: <Car size={24} />,
    },
    trains: {
        fallbackBg: "linear-gradient(to right, #232526, #414345)",
        icon: <Train size={24} />,
    },
    buses: {
        fallbackBg: "linear-gradient(to right, #614385, #516395)",
        icon: <Bus size={24} />,
    },
    cruise: {
        fallbackBg: "linear-gradient(to right, #1e3c72, #2a5298)",
        icon: <Ship size={24} />,
    },
    taxis: {
        fallbackBg: "linear-gradient(to right, #F2994A, #F2C94C)",
        icon: <Car size={24} />,
    },
    bikeRental: {
        fallbackBg: "linear-gradient(to right, #11998e, #38ef7d)",
        icon: <Bike size={24} />,
    },

    // Food & Dining
    dining: {
        fallbackBg: "linear-gradient(to right, #654ea3, #eaafc8)",
        icon: <Utensils size={24} />,
    },
    cafes: {
        fallbackBg: "linear-gradient(to right, #764BA2, #F667E7)",
        icon: <Coffee size={24} />,
    },
    bars: {
        fallbackBg: "linear-gradient(to right, #5f2c82, #49a09d)",
        icon: <Wine size={24} />,
    },
    pizza: {
        fallbackBg: "linear-gradient(to right, #F09819, #EDDE5D)",
        icon: <Pizza size={24} />,
    },
    bakery: {
        fallbackBg: "linear-gradient(to right, #FDC830, #F37335)",
        icon: <Cake size={24} />,
    },

    // Activities & Entertainment
    activities: {
        fallbackBg: "linear-gradient(to right, #134e5e, #71b280)",
        icon: <Compass size={24} />,
    },
    entertainment: {
        fallbackBg: "linear-gradient(to right, #B24592, #F15F79)",
        icon: <Star size={24} />,
    },
    movies: {
        fallbackBg: "linear-gradient(to right, #2b5876, #4e4376)",
        icon: <Film size={24} />,
    },
    concerts: {
        fallbackBg: "linear-gradient(to right, #e65c00, #F9D423)",
        icon: <Music size={24} />,
    },
    gaming: {
        fallbackBg: "linear-gradient(to right, #8E2DE2, #4A00E0)",
        icon: <Gamepad2 size={24} />,
    },
    sports: {
        fallbackBg: "linear-gradient(to right, #00c6ff, #0072ff)",
        icon: <Trophy size={24} />,
    },
    fitness: {
        fallbackBg: "linear-gradient(to right, #f46b45, #eea849)",
        icon: <Dumbbell size={24} />,
    },
    parks: {
        fallbackBg: "linear-gradient(to right, #00b09b, #96c93d)",
        icon: <Trees size={24} />,
    },
    beaches: {
        fallbackBg: "linear-gradient(to right, #FDBB2D, #22C1C3)",
        icon: <TbBeach size={24} />,
    },
    hiking: {
        fallbackBg: "linear-gradient(to right, #134E5E, #71B280)",
        icon: <Mountain size={24} />,
    },

    // Shopping & Commerce
    shopping: {
        fallbackBg: "linear-gradient(to right, #FF6B6B, #4ECDC4)",
        icon: <ShoppingBag size={24} />,
    },
    groceries: {
        fallbackBg: "linear-gradient(to right, #43C6AC, #191654)",
        icon: <ShoppingCart size={24} />,
    },
    stores: {
        fallbackBg: "linear-gradient(to right, #667eea, #764ba2)",
        icon: <Store size={24} />,
    },
    delivery: {
        fallbackBg: "linear-gradient(to right, #f093fb, #f5576c)",
        icon: <Package size={24} />,
    },

    // Services & Professional
    services: {
        fallbackBg: "linear-gradient(to right, #4776e6, #8e54e9)",
        icon: <Briefcase size={24} />,
    },
    healthcare: {
        fallbackBg: "linear-gradient(to right, #00d2ff, #3a47d5)",
        icon: <Stethoscope size={24} />,
    },
    finance: {
        fallbackBg: "linear-gradient(to right, #0f0c29, #302b63, #24243e)",
        icon: <DollarSign size={24} />,
    },
    banking: {
        fallbackBg: "linear-gradient(to right, #141e30, #243b55)",
        icon: <Landmark size={24} />,
    },
    realEstate: {
        fallbackBg: "linear-gradient(to right, #7b4397, #dc2430)",
        icon: <Home size={24} />,
    },
    repair: {
        fallbackBg: "linear-gradient(to right, #FF512F, #DD2476)",
        icon: <Wrench size={24} />,
    },
    insurance: {
        fallbackBg: "linear-gradient(to right, #4b6cb7, #182848)",
        icon: <Shield size={24} />,
    },

    // Education & Culture
    education: {
        fallbackBg: "linear-gradient(to right, #1e9600, #fff200, #ff0000)",
        icon: <GraduationCap size={24} />,
    },
    libraries: {
        fallbackBg: "linear-gradient(to right, #373b44, #4286f4)",
        icon: <Book size={24} />,
    },
    museums: {
        fallbackBg: "linear-gradient(to right, #000428, #004e92)",
        icon: <Palette size={24} />,
    },

    // Technology & Communication
    technology: {
        fallbackBg: "linear-gradient(to right, #00c9ff, #92fe9d)",
        icon: <Laptop size={24} />,
    },
    mobile: {
        fallbackBg: "linear-gradient(to right, #fc00ff, #00dbde)",
        icon: <Smartphone size={24} />,
    },
    internet: {
        fallbackBg: "linear-gradient(to right, #007991, #78ffd6)",
        icon: <Wifi size={24} />,
    },

    // Social & Community
    social: {
        fallbackBg: "linear-gradient(to right, #833ab4, #fd1d1d, #fcb045)",
        icon: <Users size={24} />,
    },
    dating: {
        fallbackBg: "linear-gradient(to right, #ff0084, #ff0084, #33001b)",
        icon: <Heart size={24} />,
    },
    events: {
        fallbackBg: "linear-gradient(to right, #6190e8, #a7bfe8)",
        icon: <Calendar size={24} />,
    },
    parties: {
        fallbackBg: "linear-gradient(to right, #ee0979, #ff6a00)",
        icon: <PartyPopper size={24} />,
    },

    // Home & Living
    furniture: {
        fallbackBg: "linear-gradient(to right, #8e9eab, #eef2f3)",
        icon: <Sofa size={24} />,
    },
    homeDecor: {
        fallbackBg: "linear-gradient(to right, #D3CCE3, #E9E4F0)",
        icon: <Lightbulb size={24} />,
    },
    bedding: {
        fallbackBg: "linear-gradient(to right, #bdc3c7, #2c3e50)",
        icon: <Bed size={24} />,
    },
    bathroom: {
        fallbackBg: "linear-gradient(to right, #2980b9, #6dd5fa, #ffffff)",
        icon: <Bath size={24} />,
    },

    // Miscellaneous
    gifts: {
        fallbackBg: "linear-gradient(to right, #DA22FF, #9733EE)",
        icon: <Gift size={24} />,
    },
    beauty: {
        fallbackBg: "linear-gradient(to right, #FAD961, #F76B1C)",
        icon: <MousePointerClick size={24} />,
    },
    weather: {
        fallbackBg: "linear-gradient(to right, #56ccf2, #2f80ed)",
        icon: <Sun size={24} />,
    },
    tickets: {
        fallbackBg: "linear-gradient(to right, #f953c6, #b91d73)",
        icon: <Ticket size={24} />,
    },
};

export type ContextStyleType = keyof typeof contextStyles;
