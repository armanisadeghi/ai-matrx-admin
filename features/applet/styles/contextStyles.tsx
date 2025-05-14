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
    Sparkles, Gift, PartyPopper, Sun
} from "lucide-react";
import { TbBeach } from "react-icons/tb";

export const contextStyles = {
    // Travel & Transportation
    hotels: {
        background: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url('/images/hotels-bg.jpg')",
        fallbackBg: "linear-gradient(to right, #0f2027, #203a43, #2c5364)",
        icon: <Building2 size={24} />,
    },
    flights: {
        background: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url('/images/flights-bg.jpg')",
        fallbackBg: "linear-gradient(to right, #2c3e50, #4ca1af)",
        icon: <Plane size={24} />,
    },
    carRental: {
        background: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url('/images/car-rental-bg.jpg')",
        fallbackBg: "linear-gradient(to right, #3D7EAA, #FFE47A)",
        icon: <Car size={24} />,
    },
    trains: {
        background: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url('/images/trains-bg.jpg')",
        fallbackBg: "linear-gradient(to right, #232526, #414345)",
        icon: <Train size={24} />,
    },
    buses: {
        background: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url('/images/buses-bg.jpg')",
        fallbackBg: "linear-gradient(to right, #614385, #516395)",
        icon: <Bus size={24} />,
    },
    cruise: {
        background: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url('/images/cruise-bg.jpg')",
        fallbackBg: "linear-gradient(to right, #1e3c72, #2a5298)",
        icon: <Ship size={24} />,
    },
    taxis: {
        background: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url('/images/taxis-bg.jpg')",
        fallbackBg: "linear-gradient(to right, #F2994A, #F2C94C)",
        icon: <Car size={24} />,
    },
    bikeRental: {
        background: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url('/images/bike-rental-bg.jpg')",
        fallbackBg: "linear-gradient(to right, #11998e, #38ef7d)",
        icon: <Bike size={24} />,
    },

    // Food & Dining
    dining: {
        background: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url('/images/dining-bg.jpg')",
        fallbackBg: "linear-gradient(to right, #654ea3, #eaafc8)",
        icon: <Utensils size={24} />,
    },
    cafes: {
        background: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url('/images/cafes-bg.jpg')",
        fallbackBg: "linear-gradient(to right, #764BA2, #F667E7)",
        icon: <Coffee size={24} />,
    },
    bars: {
        background: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url('/images/bars-bg.jpg')",
        fallbackBg: "linear-gradient(to right, #5f2c82, #49a09d)",
        icon: <Wine size={24} />,
    },
    pizza: {
        background: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url('/images/pizza-bg.jpg')",
        fallbackBg: "linear-gradient(to right, #F09819, #EDDE5D)",
        icon: <Pizza size={24} />,
    },
    bakery: {
        background: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url('/images/bakery-bg.jpg')",
        fallbackBg: "linear-gradient(to right, #FDC830, #F37335)",
        icon: <Cake size={24} />,
    },

    // Activities & Entertainment
    activities: {
        background: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url('/images/activities-bg.jpg')",
        fallbackBg: "linear-gradient(to right, #134e5e, #71b280)",
        icon: <Compass size={24} />,
    },
    entertainment: {
        background: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url('/images/entertainment-bg.jpg')",
        fallbackBg: "linear-gradient(to right, #B24592, #F15F79)",
        icon: <Star size={24} />,
    },
    movies: {
        background: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url('/images/movies-bg.jpg')",
        fallbackBg: "linear-gradient(to right, #2b5876, #4e4376)",
        icon: <Film size={24} />,
    },
    concerts: {
        background: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url('/images/concerts-bg.jpg')",
        fallbackBg: "linear-gradient(to right, #e65c00, #F9D423)",
        icon: <Music size={24} />,
    },
    gaming: {
        background: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url('/images/gaming-bg.jpg')",
        fallbackBg: "linear-gradient(to right, #8E2DE2, #4A00E0)",
        icon: <Gamepad2 size={24} />,
    },
    sports: {
        background: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url('/images/sports-bg.jpg')",
        fallbackBg: "linear-gradient(to right, #00c6ff, #0072ff)",
        icon: <Trophy size={24} />,
    },
    fitness: {
        background: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url('/images/fitness-bg.jpg')",
        fallbackBg: "linear-gradient(to right, #f46b45, #eea849)",
        icon: <Dumbbell size={24} />,
    },
    parks: {
        background: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url('/images/parks-bg.jpg')",
        fallbackBg: "linear-gradient(to right, #00b09b, #96c93d)",
        icon: <Trees size={24} />,
    },
    beaches: {
        background: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url('/images/beaches-bg.jpg')",
        fallbackBg: "linear-gradient(to right, #FDBB2D, #22C1C3)",
        icon: <TbBeach size={24} />,
    },
    hiking: {
        background: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url('/images/hiking-bg.jpg')",
        fallbackBg: "linear-gradient(to right, #134E5E, #71B280)",
        icon: <Mountain size={24} />,
    },

    // Shopping & Commerce
    shopping: {
        background: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url('/images/shopping-bg.jpg')",
        fallbackBg: "linear-gradient(to right, #FF6B6B, #4ECDC4)",
        icon: <ShoppingBag size={24} />,
    },
    groceries: {
        background: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url('/images/groceries-bg.jpg')",
        fallbackBg: "linear-gradient(to right, #43C6AC, #191654)",
        icon: <ShoppingCart size={24} />,
    },
    stores: {
        background: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url('/images/stores-bg.jpg')",
        fallbackBg: "linear-gradient(to right, #667eea, #764ba2)",
        icon: <Store size={24} />,
    },
    delivery: {
        background: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url('/images/delivery-bg.jpg')",
        fallbackBg: "linear-gradient(to right, #f093fb, #f5576c)",
        icon: <Package size={24} />,
    },

    // Services & Professional
    services: {
        background: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url('/images/services-bg.jpg')",
        fallbackBg: "linear-gradient(to right, #4776e6, #8e54e9)",
        icon: <Briefcase size={24} />,
    },
    healthcare: {
        background: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url('/images/healthcare-bg.jpg')",
        fallbackBg: "linear-gradient(to right, #00d2ff, #3a47d5)",
        icon: <Stethoscope size={24} />,
    },
    finance: {
        background: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url('/images/finance-bg.jpg')",
        fallbackBg: "linear-gradient(to right, #0f0c29, #302b63, #24243e)",
        icon: <DollarSign size={24} />,
    },
    banking: {
        background: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url('/images/banking-bg.jpg')",
        fallbackBg: "linear-gradient(to right, #141e30, #243b55)",
        icon: <Landmark size={24} />,
    },
    realEstate: {
        background: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url('/images/real-estate-bg.jpg')",
        fallbackBg: "linear-gradient(to right, #7b4397, #dc2430)",
        icon: <Home size={24} />,
    },
    repair: {
        background: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url('/images/repair-bg.jpg')",
        fallbackBg: "linear-gradient(to right, #FF512F, #DD2476)",
        icon: <Wrench size={24} />,
    },
    insurance: {
        background: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url('/images/insurance-bg.jpg')",
        fallbackBg: "linear-gradient(to right, #4b6cb7, #182848)",
        icon: <Shield size={24} />,
    },

    // Education & Culture
    education: {
        background: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url('/images/education-bg.jpg')",
        fallbackBg: "linear-gradient(to right, #1e9600, #fff200, #ff0000)",
        icon: <GraduationCap size={24} />,
    },
    libraries: {
        background: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url('/images/libraries-bg.jpg')",
        fallbackBg: "linear-gradient(to right, #373b44, #4286f4)",
        icon: <Book size={24} />,
    },
    museums: {
        background: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url('/images/museums-bg.jpg')",
        fallbackBg: "linear-gradient(to right, #000428, #004e92)",
        icon: <Palette size={24} />,
    },

    // Technology & Communication
    technology: {
        background: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url('/images/technology-bg.jpg')",
        fallbackBg: "linear-gradient(to right, #00c9ff, #92fe9d)",
        icon: <Laptop size={24} />,
    },
    mobile: {
        background: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url('/images/mobile-bg.jpg')",
        fallbackBg: "linear-gradient(to right, #fc00ff, #00dbde)",
        icon: <Smartphone size={24} />,
    },
    internet: {
        background: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url('/images/internet-bg.jpg')",
        fallbackBg: "linear-gradient(to right, #007991, #78ffd6)",
        icon: <Wifi size={24} />,
    },

    // Social & Community
    social: {
        background: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url('/images/social-bg.jpg')",
        fallbackBg: "linear-gradient(to right, #833ab4, #fd1d1d, #fcb045)",
        icon: <Users size={24} />,
    },
    dating: {
        background: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url('/images/dating-bg.jpg')",
        fallbackBg: "linear-gradient(to right, #ff0084, #ff0084, #33001b)",
        icon: <Heart size={24} />,
    },
    events: {
        background: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url('/images/events-bg.jpg')",
        fallbackBg: "linear-gradient(to right, #6190e8, #a7bfe8)",
        icon: <Calendar size={24} />,
    },
    parties: {
        background: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url('/images/parties-bg.jpg')",
        fallbackBg: "linear-gradient(to right, #ee0979, #ff6a00)",
        icon: <PartyPopper size={24} />,
    },

    // Home & Living
    furniture: {
        background: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url('/images/furniture-bg.jpg')",
        fallbackBg: "linear-gradient(to right, #8e9eab, #eef2f3)",
        icon: <Sofa size={24} />,
    },
    homeDecor: {
        background: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url('/images/home-decor-bg.jpg')",
        fallbackBg: "linear-gradient(to right, #D3CCE3, #E9E4F0)",
        icon: <Lightbulb size={24} />,
    },
    bedding: {
        background: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url('/images/bedding-bg.jpg')",
        fallbackBg: "linear-gradient(to right, #bdc3c7, #2c3e50)",
        icon: <Bed size={24} />,
    },
    bathroom: {
        background: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url('/images/bathroom-bg.jpg')",
        fallbackBg: "linear-gradient(to right, #2980b9, #6dd5fa, #ffffff)",
        icon: <Bath size={24} />,
    },

    // Miscellaneous
    gifts: {
        background: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url('/images/gifts-bg.jpg')",
        fallbackBg: "linear-gradient(to right, #DA22FF, #9733EE)",
        icon: <Gift size={24} />,
    },
    beauty: {
        background: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url('/images/beauty-bg.jpg')",
        fallbackBg: "linear-gradient(to right, #FAD961, #F76B1C)",
        icon: <Sparkles size={24} />,
    },
    weather: {
        background: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url('/images/weather-bg.jpg')",
        fallbackBg: "linear-gradient(to right, #56ccf2, #2f80ed)",
        icon: <Sun size={24} />,
    },
    tickets: {
        background: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url('/images/tickets-bg.jpg')",
        fallbackBg: "linear-gradient(to right, #f953c6, #b91d73)",
        icon: <Ticket size={24} />,
    },
};

export type ContextStyleType = keyof typeof contextStyles;
