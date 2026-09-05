import { useLanguage } from "../context/LanguageContext";
import { useState, useEffect, useRef } from 'react';
import { Search, ShoppingBag, Globe, Compass, Star, Clock, UtensilsCrossed, Check, Leaf, Tag, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  MenuItem,
  CartItem,
  Language,
  Page,
  CategoryType,
  Category,
  OrderStatus,
  Table,
  getLocalizedField,
  getMenuPriceOptions,
  getMenuPriceLabel,
  Offer
} from '../types';
import {
  getTables,
  createOrder,
  listenToSessionOrders,
  requestBill,
  callWaiter,
  getMenuItems,
  getCategories,
  listenToTables,
  getMenuVersionApi,
  getCachedMenuByLang,
  setCachedMenuByLang,
  listenToMenuVersion,
  listenToOffers
} from '../services/customerApi';
import OffersSection from "../components/OffersSection";
import { TRANSLATIONS } from '../data/translations';
import Logo from '../components/Logo';
import Header from '../components/Header';
import { DEFAULT_TABLE_AREAS, getTableDisplayName, resolveTableFromReference } from '../utils/tableUtils';
import FoodCard from '../components/FoodCard';
import FoodDetailsModal from '../components/FoodDetailsModal';
import CartDrawer from '../components/CartDrawer';
import OrderTimeline from '../components/OrderTimeline';
import CallWaiterButton from '../components/CallWaiterButton';
import LanguageSelector from '../components/LanguageSelector';
import { motion, AnimatePresence } from 'motion/react';
import { generateTables } from "../generateTables";
import { uploadCategories } from "./uploadCategories";
import { uploadMenu } from "./uploadMenu";

const LANG_TO_CODE: Record<Language, string> = {
  English: 'en',
  Russian: 'ru',
  German: 'de',
  Spanish: 'es',
  Kazakh: 'kk',
  Hebrew: 'he',
  Japanese: 'ja',
  Korean: 'ko',
};

export default function CustomerApp() {
  console.log("CustomerApp mounted");
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('rustic_charm_language');
    return (saved as Language) || 'English';
  });
  const languageRef = useRef<Language>(language);
  const menuVersionRef = useRef<number>(1);
  const [page, setPage] = useState<Page>(() => {
    const savedSession = localStorage.getItem("rusticSession");

    if (!savedSession) {
      return "landing";
    }

    const session = JSON.parse(savedSession);

    if (session.sessionId && session.table) {
      return session.currentPage || (session.active ? "order-status" : "landing");
    }

    return "landing";
  });
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | 'All'>('All');
  const [vegFilter, setVegFilter] = useState<'veg' | 'non-veg' | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [currentTable, setCurrentTable] = useState<string | number | null>(null);
  const [tableValidationError, setTableValidationError] = useState<string | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  const scrollCategories = (direction: 'left' | 'right') => {
    if (categoryScrollRef.current) {
      const scrollAmount = direction === 'left' ? -250 : 250;
      categoryScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    console.log("CURRENT TABLE STATE:", currentTable);
  }, [currentTable]);
  const [currentOrderId, setCurrentOrderId] = useState(() => {
    const saved = localStorage.getItem("rusticSession");
    if (!saved) return "";
    try {
      return JSON.parse(saved).currentOrderId || "";
    } catch {
      return "";
    }
  });
  const [currentOrderNumber, setCurrentOrderNumber] = useState(() => {
    const saved = localStorage.getItem("rusticSession");
    if (!saved) return "";
    try {
      return JSON.parse(saved).currentOrderNumber || "";
    } catch {
      return "";
    }
  });
  const [currentOrderStatus, setCurrentOrderStatus] = useState<OrderStatus>(() => {
    const saved = localStorage.getItem("rusticSession");
    if (!saved) return "Pending";
    try {
      return JSON.parse(saved).currentOrderStatus || "Pending";
    } catch {
      return "Pending";
    }
  });
  const [customerName, setCustomerName] = useState(() => {
    const saved = localStorage.getItem("rusticSession");
    if (!saved) return "";
    try {
      return JSON.parse(saved).customerName || "";
    } catch {
      return "";
    }
  });
  const [customerPhone, setCustomerPhone] = useState(() => {
    const saved = localStorage.getItem("rusticSession");
    if (!saved) return "";
    try {
      return JSON.parse(saved).customerPhone || "";
    } catch {
      return "";
    }
  });
  const [sessionOrders, setSessionOrders] = useState<any[]>([]);
  const sessionOrdersUnsubscribeRef = useRef<(() => void) | null>(null);

  const cleanupSessionListener = () => {
    if (sessionOrdersUnsubscribeRef.current) {
      sessionOrdersUnsubscribeRef.current();
      sessionOrdersUnsubscribeRef.current = null;
    }
  };

  const setStoredPage = (nextPage: Page) => {
    setPage(nextPage);
    persistSession({ currentPage: nextPage });
  };

  const expireSession = () => {
    cleanupSessionListener();
    const session = JSON.parse(localStorage.getItem("rusticSession") || "{}");
    const nextSession = {
      active: false,
      sessionId: crypto.randomUUID(),
      table: session.table || currentTable || "",
      currentOrderId: "",
      currentOrderNumber: "",
      currentOrderStatus: "Pending",
      customerName: "",
      customerPhone: "",
      currentPage: "landing",
    };
    localStorage.setItem("rusticSession", JSON.stringify(nextSession));
    setSessionId(nextSession.sessionId);
    setHasActiveOrder(false);
    setSessionOrders([]);
    setCart([]);
    setCustomerName("");
    setCustomerPhone("");
    setCurrentOrderId("");
    setCurrentOrderNumber("");
    setCurrentOrderStatus("Pending");
    setStoredPage("landing");
  };

  const resetCustomerState = (tableReference?: string | number | null) => {
    cleanupSessionListener();
    const session = JSON.parse(localStorage.getItem("rusticSession") || "{}");
    const nextSession = {
      active: false,
      sessionId: session.sessionId || crypto.randomUUID(),
      currentPage: "landing",
      currentOrderId: "",
      currentOrderNumber: "",
      currentOrderStatus: "Pending",
      customerName: "",
      customerPhone: "",
      table: tableReference ?? session.table ?? "",
    };
    localStorage.setItem("rusticSession", JSON.stringify(nextSession));
    setCurrentOrderId("");
    setCurrentOrderNumber("");
    setCurrentOrderStatus("Pending");
    setSessionOrders([]);
    setCart([]);
    setHasActiveOrder(false);
    setCustomerName("");
    setCustomerPhone("");
    setCurrentTable(tableReference ?? null);
    setTableValidationError(null);
  };

  const persistSession = (overrides: Record<string, any> = {}) => {
    const currentSession = JSON.parse(localStorage.getItem("rusticSession") || "{}");
    const nextSession = {
      ...currentSession,
      ...overrides,
      sessionId: overrides.sessionId ?? currentSession.sessionId ?? sessionId,
      table: overrides.table ?? currentSession.table ?? currentTable,
      currentOrderId: overrides.currentOrderId ?? currentSession.currentOrderId ?? currentOrderId,
      currentOrderNumber: overrides.currentOrderNumber ?? currentSession.currentOrderNumber ?? currentOrderNumber,
      currentOrderStatus: overrides.currentOrderStatus ?? currentSession.currentOrderStatus ?? currentOrderStatus,
      customerName: overrides.customerName ?? currentSession.customerName ?? customerName,
      customerPhone: overrides.customerPhone ?? currentSession.customerPhone ?? customerPhone,
      currentPage: overrides.currentPage ?? currentSession.currentPage ?? page,
    };

    localStorage.setItem("rusticSession", JSON.stringify(nextSession));
    return nextSession;
  };
  const [sessionId, setSessionId] = useState(() => {

    const saved = localStorage.getItem("rusticSession");

    if (saved) {
      const session = JSON.parse(saved);
      return session.sessionId;
    }

    const newSessionId = crypto.randomUUID();

    localStorage.setItem(
      "rusticSession",
      JSON.stringify({
        sessionId: newSessionId,
        active: false
      })
    );

    return newSessionId;

  });
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [hasActiveOrder, setHasActiveOrder] = useState(false);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    languageRef.current = lang;
    localStorage.setItem('rustic_charm_language', lang);

    const langCode = LANG_TO_CODE[lang] || 'en';
    const cached = getCachedMenuByLang(langCode, menuVersionRef.current);
    if (cached && cached.length > 0) {
      setMenuItems(cached);
    } else {
      getMenuItems(langCode)
        .then((items) => {
          if (items && items.length > 0) {
            setCachedMenuByLang(langCode, menuVersionRef.current, items);
            setMenuItems(items);
          }
        })
        .catch((err) => console.error(`Error fetching menu for ${langCode}:`, err));
    }
  };

  useEffect(() => {
    let isCancelled = false;

    async function loadInitialData() {
      try {
        const version = await getMenuVersionApi();
        menuVersionRef.current = version;

        const langCode = LANG_TO_CODE[languageRef.current] || 'en';
        const cached = getCachedMenuByLang(langCode, version);
        if (cached && cached.length > 0) {
          if (!isCancelled) setMenuItems(cached);
        } else {
          try {
            const fresh = await getMenuItems(langCode);
            if (!isCancelled && fresh && fresh.length > 0) {
              setCachedMenuByLang(langCode, version, fresh);
              setMenuItems(fresh);
            }
          } catch (err) {
            console.error("Error fetching fresh menu on mount:", err);
            const fallback = getCachedMenuByLang(langCode);
            if (!isCancelled && fallback) setMenuItems(fallback);
          }
        }
      } catch (err) {
        console.error("Error initializing menu data:", err);
      }

      try {
        const cats = await getCategories();
        if (!isCancelled && cats && cats.length > 0) {
          setCategories(cats);
        }
      } catch (err) {
        console.error("Error fetching categories on mount:", err);
      }
    }

    loadInitialData();

    // Lightweight menu version polling every 60s
    const unsubscribeVersion = listenToMenuVersion(async (newVersion) => {
      menuVersionRef.current = newVersion;
      const langCode = LANG_TO_CODE[languageRef.current] || 'en';
      try {
        const fresh = await getMenuItems(langCode);
        if (fresh && fresh.length > 0) {
          setCachedMenuByLang(langCode, newVersion, fresh);
          setMenuItems(fresh);
        }
      } catch (err) {
        console.error("Failed to update menu on version change:", err);
      }
    }, menuVersionRef.current, 60000);

    // Offers polling every 60s
    const unsubscribeOffers = listenToOffers((newOffers) => {
      setOffers(newOffers || []);
    }, 60000);

    // Live table polling every 20s — detects admin-freed tables and waiter End Session in real-time
    const unsubscribeTables = listenToTables(async (tbls) => {
      if (tbls.length === 0) {
        await generateTables();
        return; // will get fresh tables on next poll
      }
      setTables(tbls);
    }, 20000);

    return () => {
      isCancelled = true;
      unsubscribeVersion();
      unsubscribeOffers();
      unsubscribeTables();
    };

  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tableParam = params.get("table") || params.get("t");

    if (tables.length === 0) return;

    if (!tableParam) {
      const existing = JSON.parse(localStorage.getItem("rusticSession") || "{}");
      if (existing.table) {
        const matchingSavedTable = resolveTableFromReference(tables, existing.table);
        if (matchingSavedTable) {
          setCurrentTable(matchingSavedTable.tableKey || matchingSavedTable.id);
          setTableValidationError(null);
        } else {
          setCurrentTable(null);
          setTableValidationError("Not a valid table. Please scan the QR code on your table to start ordering.");
        }
      } else {
        setCurrentTable(null);
        setTableValidationError("Not a valid table. Please scan the QR code on your table to start ordering.");
      }
      return;
    }

    const tableReference = tableParam.trim();
    const matchingTable = resolveTableFromReference(tables, tableReference);

    if (!matchingTable) {
      resetCustomerState(null);
      setTableValidationError("Not a valid table. Please scan the QR code on your table to access the menu.");
      const existing = JSON.parse(localStorage.getItem("rusticSession") || "{}");
      if (existing.table) {
        localStorage.removeItem("rusticSession");
      }
      return;
    }

    const existing = JSON.parse(localStorage.getItem("rusticSession") || "{}");
    const targetTableRef = matchingTable.tableKey || matchingTable.id;
    const isSameTable = existing.table && (
      resolveTableFromReference([matchingTable], existing.table) !== null ||
      matchingTable.tableKey === existing.table ||
      matchingTable.id === existing.table ||
      existing.table === tableReference
    );

    if (isSameTable && existing.sessionId) {
      if (matchingTable.status === "available" && !matchingTable.currentSessionId && existing.active) {
        console.log("Table was freed by admin/waiter, expiring session...");
        expireSession();
        return;
      }
      setCurrentTable(targetTableRef);
      setTableValidationError(null);
      persistSession({
        table: targetTableRef,
      });
    } else {
      const nextSessionId = crypto.randomUUID();
      const nextSession = {
        active: false,
        sessionId: nextSessionId,
        table: targetTableRef,
        currentOrderId: "",
        currentOrderNumber: "",
        currentOrderStatus: "Pending",
        customerName: "",
        customerPhone: "",
        currentPage: "landing",
      };
      localStorage.setItem("rusticSession", JSON.stringify(nextSession));
      setSessionId(nextSessionId);
      setCurrentTable(targetTableRef);
      setCustomerName("");
      setCustomerPhone("");
      setSessionOrders([]);
      setCart([]);
      setHasActiveOrder(false);
      setTableValidationError(null);
      setPage("landing");
    }

    console.log("QR TABLE RESOLVED:", matchingTable);
  }, [tables]);
  useEffect(() => {

    if (tables.length === 0) return;


    const savedSession = localStorage.getItem("rusticSession");

    if (!savedSession) return;


    const session = JSON.parse(savedSession);


    if (session.table) {

      const requestedTable = session.table;
      const tableObj = (session.active && session.sessionId
        ? tables.find((table) => table.currentSessionId === session.sessionId)
        : null) || tables.find(
          (table) => resolveTableFromReference([table], requestedTable)
        );

      console.log("RESTORE TABLE:", requestedTable);
      console.log("TABLE EXISTS:", !!tableObj);

      if (tableObj) {
        const nextTableReference = tableObj.tableKey || tableObj.id || requestedTable;
        setCurrentTable(nextTableReference);
        setTableValidationError(null);

        if (
          tableObj.currentSessionId !== session.sessionId &&
          session.active &&
          tableObj.status === "available" &&
          !tableObj.currentSessionId
        ) {
          console.log("Table was freed by admin, expiring session...");
          expireSession();
        }
        if (nextTableReference !== session.table) {
          persistSession({ table: nextTableReference });
        }
      } else {
        setCurrentTable(null);
        setTableValidationError("This table link is invalid. Please open the app from a registered table link such as http://localhost:3000/?table=deck-area-1.");
        localStorage.removeItem("rusticSession");
      }

    }


  }, [tables]);
  useEffect(() => {
    if (sessionOrders.length === 0) return;

    const latestOrder = sessionOrders[sessionOrders.length - 1];

    setCurrentOrderId(latestOrder.id);
    setCurrentOrderNumber(latestOrder.orderNumber);
    setCurrentOrderStatus(latestOrder.status);
  }, [sessionOrders]);
  // useEffect(() => {
  //   
  // }, []);
  // useEffect(() => {
  //   
  // }, []);
  // Keep the initial fetches to a single load so the app does not hammer the API
  // on every mount or on a rapid polling loop.
  useEffect(() => {
    if (page !== 'menu' || categories.length > 0) return;
    getCategories().then((data) => {
      if (Array.isArray(data) && data.length > 0) {
        setCategories(data);
      }
    }).catch(() => {
      // Ignore transient category fetch errors; the page can still render the cached view.
    });
  }, [page, categories.length]);



  useEffect(() => {
    if (tables.length === 0) return;

    const savedSession = localStorage.getItem("rusticSession");

    if (!savedSession) {
      setPage("landing");
      return;
    }

    const session = JSON.parse(savedSession);

    if (!session.sessionId || !session.table) {
      setPage("landing");
      return;
    }

    const table = (session.active && session.sessionId
      ? tables.find((candidate) => candidate.currentSessionId === session.sessionId)
      : null) || tables.find((candidate) => resolveTableFromReference([candidate], session.table));

    if (!table) {
      localStorage.removeItem("rusticSession");
      setPage("landing");
      return;
    }

    const nextTableReference = table.tableKey || table.id || session.table;
    setCurrentTable(nextTableReference);
    setSessionId(session.sessionId);
    setCurrentOrderId(session.currentOrderId || "");
    setCurrentOrderNumber(session.currentOrderNumber || "");
    setCurrentOrderStatus((session.currentOrderStatus as OrderStatus) || "Pending");
    setCustomerName(session.customerName || "");
    setCustomerPhone(session.customerPhone || "");
    setHasActiveOrder(Boolean(session.active || session.currentOrderId || session.currentOrderNumber));
    if (nextTableReference !== session.table) {
      persistSession({ table: nextTableReference });
    }

    const restoredPage = session.currentPage as Page | undefined;
    if (restoredPage) {
      setPage(restoredPage);
    } else {
      setPage(session.active ? "order-status" : "landing");
    }

    cleanupSessionListener();

    let unsubscribe: () => void = () => { };
    if (session.active) {
      unsubscribe = listenToSessionOrders(
        session.sessionId,
        (orders) => {
          setSessionOrders(orders);

          if (orders.length > 0) {
            const latest = orders[orders.length - 1];
            setCurrentOrderId(latest.id);
            setCurrentOrderNumber(latest.orderNumber);
            setCurrentOrderStatus(latest.status);
            persistSession({
              currentOrderId: latest.id,
              currentOrderNumber: latest.orderNumber,
              currentOrderStatus: latest.status,
            });

            if (latest.status === "Session Ended" || latest.status === "Completed") {
              expireSession();
              return;
            }
          } else if (session.currentOrderId || session.currentOrderNumber) {
            setHasActiveOrder(true);
          }
        }
      );
      sessionOrdersUnsubscribeRef.current = unsubscribe;
    } else {
      sessionOrdersUnsubscribeRef.current = null;
    }

    return () => cleanupSessionListener();
  }, [tables]);

  const t = TRANSLATIONS[language];

  // Cart operations
  const handleAddToCart = (
    item: MenuItem,
    quantity: number,
    specialInstructions?: string,
    selectedPriceOption?: { quantity: number; amount: number }
  ) => {
    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex(
        (cartItem) =>
          cartItem.menuItem.id === item.id &&
          cartItem.specialInstructions === specialInstructions &&
          (cartItem.selectedPriceOption?.quantity ?? 1) === (selectedPriceOption?.quantity ?? 1) &&
          (cartItem.selectedPriceOption?.amount ?? 0) === (selectedPriceOption?.amount ?? 0)
      );

      if (existingIndex > -1) {
        const updated = [...prevCart];
        updated[existingIndex].quantity += quantity;
        return updated;
      }

      return [...prevCart, { menuItem: item, quantity, specialInstructions, selectedPriceOption }];
    });
  };

  const handleUpdateCartQuantity = (itemId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveCartItem(itemId);
      return;
    }
    setCart((prevCart) =>
      prevCart.map((item) => (item.menuItem.id === itemId ? { ...item, quantity: newQty } : item))
    );
  };

  const handleRemoveCartItem = (itemId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.menuItem.id !== itemId));
  };
  const startSessionListener = (sessionId: string) => {
    cleanupSessionListener();
    const unsubscribe = listenToSessionOrders(
      sessionId,
      (orders) => {
        console.log("Updated session orders:", orders);

        setSessionOrders(orders);

        if (orders.length > 0) {
          const latest = orders[orders.length - 1];

          setCurrentOrderId(latest.id);
          setCurrentOrderNumber(latest.orderNumber);
          setCurrentOrderStatus(latest.status);
        } else if (currentOrderId || currentOrderNumber) {
          setHasActiveOrder(true);
        } else {
          setCurrentOrderStatus("Pending");
          setHasActiveOrder(true);
        }
      }
    );

    sessionOrdersUnsubscribeRef.current = unsubscribe;
    return unsubscribe;
  };

  const handlePlaceOrder = async () => {
    if (isPlacingOrder) return;

    setIsPlacingOrder(true);
    try {
      cleanupSessionListener();
      const existingSession = JSON.parse(
        localStorage.getItem("rusticSession") || "{}"
      );

      const tableToUse = currentTable || existingSession.table;

      if (!tableToUse || !tables.some((table) => resolveTableFromReference([table], tableToUse))) {
        throw new Error("Please open the app from a valid table link such as http://localhost:3000/?table=deck-area-1.");
      }

      let sessionId = existingSession.sessionId;

      if (!existingSession.active) {
        sessionId = crypto.randomUUID();

        persistSession({
          active: true,
          sessionId,
          table: tableToUse,
        });

        setSessionId(sessionId);
      }

      console.log("USING SESSION ID:", sessionId);
      const total = cart.reduce(
        (sum, item) => sum + (item.selectedPriceOption?.amount ?? item.menuItem.price ?? 0) * item.quantity,
        0
      );

      console.log("currentTable =", tableToUse);
      console.log("sessionId =", sessionId);
      console.log("cart =", cart);

      const result = await createOrder(
        {
          tableReference: tableToUse,
          cart,
          total,
          sessionId,
          customerName,
          customerPhone,
        }
      );

      setHasActiveOrder(true);
      console.log("Saving session:", {
        active: true,
        sessionId,
        table: tableToUse,
      });

      persistSession({
        active: true,
        sessionId,
        table: tableToUse,
        currentOrderId: result.id,
        currentOrderNumber: result.orderNumber,
        currentOrderStatus: "Pending",
        customerName,
        customerPhone,
      });
      setSessionId(sessionId);
      setCurrentTable(tableToUse);
      startSessionListener(sessionId);

      setCurrentOrderId(result.id);
      setCurrentOrderNumber(result.orderNumber);
      setCurrentOrderStatus("Pending");

      setCart([]);

      setIsCartOpen(false);
      setIsPlacingOrder(false);
      setStoredPage('order-status');

    } catch (error: any) {
      setIsPlacingOrder(false);

      console.error(error);

      alert(error?.message || JSON.stringify(error));
    }
  };


  const handleGoToMenu = () => {
    setStoredPage('menu');
  };

  const handleGoToHome = () => {
    setStoredPage('landing');
  };

  const handleResetOrder = () => {
    setStoredPage('landing');
  };
  async function handleRequestBill() {
    const latestOrder = sessionOrders[sessionOrders.length - 1];

    if (!latestOrder) return;

    try {
      await requestBill(latestOrder.id);
    } catch (error: any) {
      console.error("Failed to request bill", error);
    }
  }


  // Filtering Menu Items

  console.log("MENU ITEMS STATE:", menuItems);
  console.log("MENU ITEMS COUNT:", menuItems.length);
  console.log("Selected Category:", selectedCategory);

  console.log(
    "Menu Categories:",
    menuItems.map(i => i.category)
  );

  console.log(
    "Filtered Count:",
    menuItems.filter(item =>
      selectedCategory === "All" ||
      item.category?.toLowerCase() === selectedCategory.toLowerCase()
    ).length
  );

  const getCategoryString = (val: any): string => {
    if (!val) return "";
    const localized = getLocalizedField(val, language);
    if (localized) return localized;
    if (typeof val === "string") return val;
    return String(val);
  };

  const filteredMenuItems = menuItems.filter((item) => {
    const query = searchQuery.toLowerCase();
    const selCatStr = getCategoryString(selectedCategory).trim().toLowerCase();
    const itemCatStr = getCategoryString(item.category).trim().toLowerCase();

    const matchesCategory =
      selectedCategory === "All" ||
      selCatStr === "all" ||
      itemCatStr === selCatStr;

    const nameStr = getLocalizedField(item.name, language, item);
    const descStr = getLocalizedField(item.description, language, item);

    const matchesSearch =
      nameStr.toLowerCase().includes(query) ||
      descStr.toLowerCase().includes(query) ||
      (item.ingredients ?? []).some((ing) =>
        ing.toLowerCase().includes(query)
      );

    const matchesVegFilter =
      vegFilter === null ||
      (vegFilter === 'veg' && item.isVeg) ||
      (vegFilter === 'non-veg' && !item.isVeg);

    return matchesCategory && matchesSearch && matchesVegFilter;
  });

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  if (page === "session-expired") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">

        <h1 className="text-3xl font-bold mb-4">
          Session Ended
        </h1>

        <p className="text-gray-600 max-w-md">
          This table session has ended.
          Please scan the QR code on your table again to start a new order.
        </p>

      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream selection:bg-gold/20 selection:text-olive flex flex-col relative" id="rustic-charm-app">

      {/* Dynamic View Routing */}
      <AnimatePresence mode="wait">

        {/* PAGE 1: LANDING PAGE */}
        {page === 'landing' && (
          <motion.div
            key="landing-page"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="flex-grow flex flex-col"
            id="landing-page-container"
          >
            {/* Elegant Top Border bar */}
            <div className="h-1 bg-gradient-to-r from-olive via-gold to-olive w-full" />

            <div className="max-w-4xl mx-auto px-3 sm:px-4 py-8 sm:py-12 md:py-16 flex-grow flex flex-col justify-center items-center" id="landing-main-content">

              {/* Grand Brand Logo */}
              <Logo size="lg" className="mb-10" />

              {/* Beautiful, warm Hero Cover Image */}
              <div
                className="w-full aspect-[16/10] sm:aspect-[21/9] md:aspect-[16/6] rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm border border-light-gray/40 relative mb-8 sm:mb-12 group bg-charcoal/5"
                id="landing-hero-banner"
              >
                <img
                  src="https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?q=80&w=1200&auto=format&fit=crop"
                  alt="Rustic Dining Table Set"
                  className="w-full h-full object-cover opacity-95 transition-transform duration-1000 ease-out group-hover:scale-[1.01]"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-cream/30 to-transparent" />
              </div>

              {/* Welcome Message */}
              <div className="text-center max-w-xl mx-auto mb-8 sm:mb-12 space-y-3.5" id="landing-welcome-section">
                <h2 className="font-elegant text-2xl md:text-3.5xl font-medium tracking-wide text-charcoal italic">
                  {t.welcome}
                </h2>
                <p className="text-sm text-soft-gray leading-relaxed font-light tracking-wide">
                  {t.subtitle}
                </p>
              </div>

              <div className="w-full max-w-md mx-auto mb-8 sm:mb-10 rounded-2xl border border-light-gray/60 bg-white/90 p-4 shadow-sm">
                <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-soft-gray mb-3">
                  Customer details
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-sm text-charcoal">
                    <span className="font-medium">Name</span>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => {
                        const name = e.target.value;
                        setCustomerName(name);
                        persistSession({ customerName: name });
                      }}
                      placeholder="Optional"
                      className="w-full rounded-xl border border-light-gray/70 bg-cream px-3 py-2.5 text-sm outline-none focus:border-olive"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm text-charcoal">
                    <span className="font-medium">Phone</span>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        const phone = val.slice(0, 10);
                        setCustomerPhone(phone);
                        persistSession({ customerPhone: phone });
                      }}
                      placeholder="Optional"
                      className="w-full rounded-xl border border-light-gray/70 bg-cream px-3 py-2.5 text-sm outline-none focus:border-olive"
                    />
                  </label>
                </div>
              </div>

              {/* Language Selection Grid */}
              <div className="w-full border-t border-light-gray/50 pt-6 sm:pt-8 mb-8 sm:mb-12" id="landing-language-section">
                <LanguageSelector
                  currentLanguage={language}
                  onLanguageChange={(lang) => setLanguage(lang)}
                  variant="large"
                />
              </div>

              {/* Table Info & Call to Action */}
              <div className="w-full max-w-sm mx-auto flex flex-col items-center gap-4 sm:gap-6" id="landing-cta-section">
                {/* Elegant Table Card */}
                <div className={`border px-6 py-4 rounded-2xl shadow-2xs flex items-center justify-center gap-3 w-full transition-all ${
                  currentTable && !tableValidationError
                    ? "bg-white border-light-gray/60"
                    : "bg-amber-50/80 border-amber-200"
                }`}>
                  <div className={`w-2.5 h-2.5 rounded-full ${
                    currentTable && !tableValidationError
                      ? "bg-olive animate-pulse"
                      : "bg-amber-500"
                  }`} />
                  <span className="text-xs uppercase tracking-[0.15em] font-bold text-soft-gray">
                    {currentTable && !tableValidationError ? `${t.table} ${currentTable}` : "No Table Selected"}
                  </span>
                  <span className="text-light-gray">|</span>
                  <span className={`text-xs font-semibold uppercase tracking-wider ${
                    currentTable && !tableValidationError ? "text-charcoal" : "text-amber-800"
                  }`}>
                    {currentTable && !tableValidationError ? "Guest Ordering" : "Scan Table QR"}
                  </span>
                </div>

                {tableValidationError && (
                  <div className="w-full rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs sm:text-sm text-red-700 font-medium leading-relaxed text-center">
                    ⚠️ {tableValidationError}
                  </div>
                )}

                {/* Primary Cta Button */}
                <button
                  onClick={() => {
                    if (!currentTable || !!tableValidationError) {
                      alert("Not a valid table. Please scan the QR code on your table to access the menu.");
                      return;
                    }
                    setStoredPage('menu');
                  }}
                  disabled={!currentTable || !!tableValidationError}
                  className="w-full bg-olive hover:bg-olive-dark text-white font-semibold text-sm tracking-widest uppercase py-3.5 sm:py-4.5 px-6 sm:px-8 rounded-full transition-all duration-300 shadow-md hover:shadow-lg hover:shadow-olive/10 cursor-pointer active:scale-98 flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-400"
                  id="start-ordering-button"
                >
                  <span>{t.startOrdering}</span>
                </button>
              </div>
            </div>

            {/* Subtle Footer credit */}
            <footer className="text-center py-6 border-t border-light-gray/25 text-[10px] text-soft-gray/60 uppercase tracking-widest">
              © {new Date().getFullYear()} Rustic Charm Restaurant • Handcrafted Luxury
            </footer>
          </motion.div>
        )}

        {/* PAGE 2: MENU PAGE */}
        {page === 'menu' && (
          <motion.div
            key="menu-page"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-grow flex flex-col"
            id="menu-page-container"
          >
            {/* Header */}
            <Header
              currentLanguage={language}
              currentTable={currentTable}
              onLanguageChange={(lang) => setLanguage(lang)}
              cartCount={cartCount}
              onCartClick={() => setIsCartOpen(true)}

              hasActiveOrder={hasActiveOrder}
              onOrdersClick={() => setStoredPage("order-status")}
            />

            {/* Menu Body */}
            <main className="flex-grow max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-10" id="menu-main-content">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

                {/* Left side: Offers */}
                {offers.some(o => o.isActive !== false) && (
                  <div className="lg:col-span-1">
                    <OffersSection offers={offers} />
                  </div>
                )}

                {/* Right side: Search, Categories, and Food items */}
                <div className={offers.some(o => o.isActive !== false) ? "lg:col-span-3 space-y-6" : "lg:col-span-4 space-y-6"}>
                  {/* Top Filters Block (Search & Category Scroll) */}
                  <div className="space-y-4 sm:space-y-6 mb-8 sm:mb-12" id="menu-filters-wrapper">
                    {/* Offers logo/badge option on the top left of search button */}
                    {offers.some(o => o.isActive !== false) && (
                      <div className="max-w-xl mx-auto flex justify-start pl-4 mb-[-8px]">
                        <button
                          onClick={() => {
                            const element = document.getElementById("offers-section");
                            if (element) {
                              element.scrollIntoView({ behavior: "smooth" });
                            }
                          }}
                          className="flex items-center gap-1.5 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-3xs active:scale-95 border border-yellow-200/50"
                        >
                          <Tag size={12} className="text-yellow-600 animate-pulse" />
                          <span>Offers Available ({offers.filter(o => o.isActive !== false).length})</span>
                        </button>
                      </div>
                    )}
                    {/* Search Bar */}
                    <div className="relative max-w-xl mx-auto" id="search-input-container">
                      <Search className="w-4.5 h-4.5 absolute left-4.5 top-1/2 -translate-y-1/2 text-olive/70" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t.searchPlaceholder}
                        className="w-full bg-white border border-light-gray rounded-full pl-12 pr-6 py-3.5 text-sm font-medium focus:ring-1 focus:ring-gold focus:border-gold outline-none transition-all shadow-2xs placeholder:text-soft-gray/50"
                        id="menu-search-input"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute right-4.5 top-1/2 -translate-y-1/2 text-xs text-soft-gray hover:text-charcoal"
                          id="search-clear-btn"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    {/* Elegant Horizontal Scrollable Categories */}
                    <div className="relative group px-1 sm:px-8" id="categories-scroll-wrapper">
                      {/* Left Scroll Button */}
                      <button
                        onClick={() => scrollCategories('left')}
                        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white/95 shadow-md border border-light-gray/60 flex items-center justify-center text-charcoal hover:bg-olive hover:text-white transition-all cursor-pointer hidden sm:flex"
                        aria-label="Scroll categories left"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>

                      <div
                        ref={categoryScrollRef}
                        className="flex items-center gap-2 overflow-x-auto pb-3 pt-1 scrollbar-none scroll-smooth flex-nowrap -mx-3 px-3 sm:mx-0 sm:px-0 justify-start"
                        id="categories-scroll"
                      >
                        {[
                          { id: 'All', name: t.all, rawName: 'All' },
                          ...categories.map(cat => {
                            const raw = getCategoryString(cat.name);
                            return {
                              id: cat.id,
                              name: getLocalizedField(cat.name, language, cat) || raw,
                              rawName: raw
                            };
                          })
                        ].map((cat) => {
                          const isSelected = getCategoryString(selectedCategory).trim().toLowerCase() === getCategoryString(cat.rawName).trim().toLowerCase();

                          return (
                            <button
                              key={cat.id}
                              onClick={() => setSelectedCategory(cat.rawName as CategoryType | "All")}
                              className={`px-5 py-2.5 rounded-full text-xs font-semibold tracking-wider uppercase transition-all duration-300 flex-shrink-0 cursor-pointer ${isSelected
                                ? 'bg-olive text-white shadow-sm font-bold'
                                : 'bg-white border border-light-gray/70 text-charcoal hover:border-gold hover:bg-cream/20'
                                }`}
                              id={`cat-btn-${String(cat.id || '').replace(/\s+/g, '-').toLowerCase()}`}
                            >
                              {cat.name}
                            </button>
                          );
                        })}
                      </div>

                      {/* Right Scroll Button */}
                      <button
                        onClick={() => scrollCategories('right')}
                        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white/95 shadow-md border border-light-gray/60 flex items-center justify-center text-charcoal hover:bg-olive hover:text-white transition-all cursor-pointer hidden sm:flex"
                        aria-label="Scroll categories right"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Veg/Non Veg Filter Buttons */}
                  <div className="flex gap-3 justify-center mb-6" id="veg-filter-buttons">
                    <button
                      onClick={() => setVegFilter(vegFilter === 'veg' ? null : 'veg')}
                      className={`px-6 py-2.5 rounded-full text-sm font-semibold tracking-wider uppercase transition-all duration-300 cursor-pointer flex items-center gap-2 border-2 ${vegFilter === 'veg'
                          ? 'bg-green-600 text-white border-green-800 shadow-lg font-bold scale-105'
                          : 'bg-white border-green-700 text-green-700 hover:bg-green-50 hover:shadow-md active:scale-95'
                        }`}
                      id="veg-filter-btn"
                    >
                      <Leaf size={16} />
                      <span>Veg</span>
                    </button>
                    <button
                      onClick={() => setVegFilter(vegFilter === 'non-veg' ? null : 'non-veg')}
                      className={`px-6 py-2.5 rounded-full text-sm font-semibold tracking-wider uppercase transition-all duration-300 cursor-pointer flex items-center gap-2 border-2 ${vegFilter === 'non-veg'
                          ? 'bg-red-600 text-white border-red-800 shadow-lg font-bold scale-105'
                          : 'bg-white border-red-700 text-red-700 hover:bg-red-50 hover:shadow-md active:scale-95'
                        }`}
                      id="non-veg-filter-btn"
                    >
                      <span>Non Veg</span>
                    </button>
                  </div>

                  {/* Food Cards Grid */}
                  <div className="min-h-[400px]" id="food-grid-section">
                    {filteredMenuItems.length === 0 ? (
                      <div className="text-center py-24 space-y-4" id="menu-empty-state">
                        <Compass className="w-10 h-10 mx-auto text-soft-gray/40 stroke-1" />
                        <h3 className="font-serif italic text-lg text-charcoal font-semibold">
                          No culinary matches found
                        </h3>
                        <p className="text-xs text-soft-gray max-w-xs mx-auto">
                          Try adjusting your search terms or selecting another gourmet category.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6" id="menu-cards-grid">
                        {filteredMenuItems.map((item) => {
                          const itemLocalizedName = getLocalizedField(item.name, language, item);
                          const itemLocalizedDesc = getLocalizedField(item.description, language, item);
                          const priceLabel = getMenuPriceLabel(item);
                          return (
                            <div
                              key={item.id}
                              onClick={() => setSelectedItem(item)}
                              className="group bg-white rounded-2xl overflow-hidden border border-gray-200 shadow hover:shadow-xl transition-all duration-300 cursor-pointer"
                            >
                              {/* Image */}
                              <div className="relative h-48 overflow-hidden">
                                <img
                                  src={item.image || "/placeholder-food.jpg"}
                                  alt={itemLocalizedName}
                                  className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                                />

                                <div className="absolute top-3 left-3">
                                  {item.isVeg ? (
                                    <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-full">
                                      Veg
                                    </span>
                                  ) : (
                                    <span className="bg-red-600 text-white text-xs px-2 py-1 rounded-full">
                                      Non Veg
                                    </span>
                                  )}
                                </div>

                                {!item.isAvailable && (
                                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                    <span className="text-white font-bold text-lg">
                                      Currently Unavailable
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Details */}
                              <div className="p-4">
                                <div className="flex justify-between items-start">
                                  <h3 className="font-semibold text-lg text-gray-900">
                                    {itemLocalizedName}
                                  </h3>

                                  <span className="font-bold text-green-700">
                                    {priceLabel}
                                  </span>
                                </div>

                                <p className="text-sm text-gray-500 mt-1">
                                  {getCategoryString(item.category)}
                                </p>

                                <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                                  {itemLocalizedDesc}
                                </p>

                                <button
                                  className="mt-4 w-full bg-[#556B2F] text-white py-2 rounded-lg hover:bg-[#445522] transition"
                                >
                                  View Details
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </main>
          </motion.div>
        )}

        {/* PAGE 3: ORDER STATUS TIMELINE */}
        {page === 'order-status' && (
          <motion.div
            key="status-page"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-grow flex flex-col justify-center"
            id="status-page-container"
          >
            {/* Mini Brand header for tracking */}
            <div className="py-5 border-b border-light-gray/30 bg-white/40 backdrop-blur-md flex items-center justify-center">
              <Logo size="sm" variant="horizontal" />
            </div>

            <main className="flex-grow flex items-center justify-center py-6 sm:py-12 px-3 sm:px-4" id="status-main-content">
              <OrderTimeline
                language={language}
                currentTable={currentTable}
                currentOrderNumber={currentOrderNumber}
                currentOrderStatus={currentOrderStatus}
                sessionOrders={sessionOrders}
                onBackToMenu={handleGoToMenu}
                onResetOrder={handleGoToHome}
                onRequestBill={handleRequestBill}
                onCallWaiter={async () => {
                  try {
                    await callWaiter({
                      tableReference: currentTable,
                      sessionId,
                      customerName,
                      customerPhone,
                      orderId: currentOrderId,
                    });
                  } catch (error) {
                    console.error("Failed to notify waiter", error);
                  }
                }}
              />
            </main>
          </motion.div>
        )}

      </AnimatePresence>

      {/* OVERLAY MODAL: FOOD DETAILS */}
      <AnimatePresence>
        {selectedItem && (
          <FoodDetailsModal
            item={selectedItem}
            language={language}
            onClose={() => setSelectedItem(null)}
            onAddToCart={(item, qty, inst) => handleAddToCart(item, qty, inst)}
          />
        )}
      </AnimatePresence>

      {/* OVERLAY SLIDER: CART DRAWER */}
      <CartDrawer
        isOpen={isCartOpen}
        cartItems={cart}
        language={language}
        onClose={() => setIsCartOpen(false)}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onPlaceOrder={handlePlaceOrder}
        isPlacingOrder={isPlacingOrder}
      />

      {/* FLOATING ACTION: CALL WAITER */}
      <CallWaiterButton
        language={language}
        onCallWaiter={async () => {
          try {
            await callWaiter({
              tableReference: currentTable,
              sessionId,
              customerName,
              customerPhone,
              orderId: currentOrderId,
            });
          } catch (error) {
            console.error("Failed to notify waiter", error);
          }
        }}
      />

    </div>
  );
}
