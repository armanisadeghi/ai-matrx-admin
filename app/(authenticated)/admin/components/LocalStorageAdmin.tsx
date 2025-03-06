'use client';

import {useState, useEffect} from 'react';
import {motion, AnimatePresence} from 'framer-motion';
import {Button} from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription, DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {ScrollArea} from '@/components/ui/scroll-area';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Trash2,
    Plus,
    RefreshCw,
    Edit3,
    Save,
    Download,
    Upload,
    Copy,
    Check, AlertTriangle, MoreVertical
} from 'lucide-react';
import {EnhancedJsonViewer} from '@/components/ui/JsonComponents';
import useLocalStorageManager, {StorageVerification, UseLocalStorageManager, CookieOptions} from '@/hooks/common/useLocalStorageManager';
import {EnhancedEditableJsonViewer} from "@/components/ui/JsonComponents/JsonEditor";

// Types
interface StorageItem {
    module: string;
    feature: string;
    key: string;
    value: any;
}

interface VerificationStatus {
    isVerifying: boolean;
    status: StorageVerification | null;
}

interface CookieDetailView extends CookieOptions {
    name: string;
    value: string;
}

const ConfirmationDialog = (
    {
        open,
        onOpenChange,
        onConfirm,
        title,
        description,
        confirmText = "Confirm",
        variant = "default"
    }: {
        open: boolean;
        onOpenChange: (open: boolean) => void;
        onConfirm: () => void;
        title: string;
        description: string;
        confirmText?: string;
        variant?: "default" | "destructive";
    }) => {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button variant={variant} onClick={onConfirm}>
                        {confirmText}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

// New Verification Badge Component
const VerificationBadge = ({status}: { status: VerificationStatus }) => {
    if (!status.status) return null;

    return (
        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
            status.status.success
            ? 'bg-green-100 text-green-800'
            : 'bg-red-100 text-red-800'
        }`}>
            {status.status.success ? (
                <Check className="w-3 h-3 mr-1"/>
            ) : (
                 <AlertTriangle className="w-3 h-3 mr-1"/>
             )}
            {status.isVerifying ? 'Verifying...' : status.status.message}
        </div>
    );
};

// New Cookie Details Component
const CookieDetailsView = ({details}: { details: CookieDetailView }) => {
    return (
        <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="font-medium">Expires:</span>
                <span>{details.expires || 'Session'}</span>

                <span className="font-medium">Path:</span>
                <span>{details.path || '/'}</span>

                <span className="font-medium">Domain:</span>
                <span>{details.domain || 'Current'}</span>

                <span className="font-medium">Secure:</span>
                <span>{details.secure ? 'Yes' : 'No'}</span>

                <span className="font-medium">SameSite:</span>
                <span>{details.sameSite || 'Lax'}</span>
            </div>
        </div>
    );
};

const StorageManager = ({storage, onRefresh}: {
    storage: UseLocalStorageManager;
    onRefresh: () => void;
}) => {
    const [modules, setModules] = useState<string[]>([]);
    const [selectedModule, setSelectedModule] = useState<string>('');
    const [features, setFeatures] = useState<string[]>([]);
    const [items, setItems] = useState<Record<string, any>>({});
    const [newItemDialog, setNewItemDialog] = useState(false);
    const [editingKey, setEditingKey] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<StorageVerification | null>(null);
    const [verificationStatuses, setVerificationStatuses] = useState<Record<string, VerificationStatus>>({});
    const [confirmDialog, setConfirmDialog] = useState<{
        open: boolean;
        action: () => Promise<void>;
        title: string;
        description: string;
    }>({
        open: false,
        action: async () => {
        },
        title: '',
        description: '',
    });

    // Form states
    const [newModule, setNewModule] = useState('');
    const [newFeature, setNewFeature] = useState('');
    const [newKey, setNewKey] = useState('');
    const [newValue, setNewValue] = useState<object>({});

    const refreshData = async () => {
        const allModules = await storage.getAllModules();
        setModules(allModules);

        if (selectedModule) {
            const moduleFeatures = await storage.getAllFeatures(selectedModule);
            setFeatures(moduleFeatures);

            const allItems: Record<string, any> = {};
            for (const feature of moduleFeatures) {
                const keys = await storage.getAllKeys();
                for (const key of keys) {
                    if (key.startsWith(`${selectedModule}/${feature}/`)) {
                        const value = await storage.getItem(selectedModule, feature, key.split('/')[2]);
                        allItems[key] = value;
                        // Verify each item
                        await verifyItem(selectedModule, feature, key.split('/')[2]);
                    }
                }
            }
            setItems(allItems);
        }
        onRefresh();
    };

    const verifyItem = async (module: string, feature: string, key: string) => {
        const fullKey = `${module}/${feature}/${key}`;
        setVerificationStatuses(prev => ({
            ...prev,
            [fullKey]: {isVerifying: true, status: null}
        }));

        const result = await storage.verifyStorageItem(module, feature, key);

        setVerificationStatuses(prev => ({
            ...prev,
            [fullKey]: {isVerifying: false, status: result}
        }));

        return result;
    };

    const handleAddItem = async () => {
        if (newModule && newFeature && newKey) {
            const result = await storage.setItem(newModule, newFeature, newKey, newValue);
            setFeedback(result);
            if (result.success) {
                setNewItemDialog(false);
                refreshData();
                setNewModule('');
                setNewFeature('');
                setNewKey('');
                setNewValue({});
            }
        }
    };

    const handleDeleteItem = async (module: string, feature: string, key: string) => {
        setConfirmDialog({
            open: true,
            action: async () => {
                const result = await storage.removeItem(module, feature, key);
                setFeedback(result);
                if (result.success) {
                    refreshData();
                }
                setConfirmDialog(prev => ({...prev, open: false}));
            },
            title: 'Confirm Deletion',
            description: `Are you sure you want to delete ${module}/${feature}/${key}?`
        });
    };
    const handleUpdateItem = async (module: string, feature: string, key: string, value: object) => {
        const result = await storage.setItem(module, feature, key, value);
        setFeedback(result);
        if (result.success) {
            setEditingKey(null);
            refreshData();
        }
    };
    const handleClearFeature = async (module: string, feature: string) => {
        setConfirmDialog({
            open: true,
            action: async () => {
                const result = await storage.clearFeature(module, feature);
                setFeedback(result);
                if (result.success) {
                    refreshData();
                }
                setConfirmDialog(prev => ({...prev, open: false}));
            },
            title: 'Clear Feature',
            description: `Are you sure you want to clear all items in ${module}/${feature}?`
        });
    };

    const handleClearModule = async (module: string) => {
        setConfirmDialog({
            open: true,
            action: async () => {
                const result = await storage.clearModule(module);
                setFeedback(result);
                if (result.success) {
                    refreshData();
                }
                setConfirmDialog(prev => ({...prev, open: false}));
            },
            title: 'Clear Module',
            description: `Are you sure you want to clear all items in ${module}?`
        });
    };

    const handleClearAll = async () => {
        setConfirmDialog({
            open: true,
            action: async () => {
                const result = await storage.clearAll();
                setFeedback(result);
                if (result.success) {
                    refreshData();
                }
                setConfirmDialog(prev => ({...prev, open: false}));
            },
            title: 'Clear All Storage',
            description: 'Are you sure you want to clear all items from storage? This action cannot be undone.'
        });
    };

    useEffect(() => {
        refreshData();
    }, [selectedModule]);

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div className="flex gap-2">
                    <Button onClick={refreshData}>
                        <RefreshCw className="w-4 h-4 mr-2"/>
                        Refresh
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline">
                                <MoreVertical className="w-4 h-4 mr-2"/>
                                Bulk Operations
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            {selectedModule && features.map(feature => (
                                <DropdownMenuItem
                                    key={feature}
                                    onClick={() => handleClearFeature(selectedModule, feature)}
                                >
                                    Clear {selectedModule}/{feature}
                                </DropdownMenuItem>
                            ))}
                            {selectedModule && (
                                <DropdownMenuItem
                                    onClick={() => handleClearModule(selectedModule)}
                                >
                                    Clear {selectedModule}
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                                className="text-red-600"
                                onClick={handleClearAll}
                            >
                                Clear All Storage
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <Dialog open={newItemDialog} onOpenChange={setNewItemDialog}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="w-4 h-4 mr-2"/>
                            Add New Item
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New Item</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label>Module</Label>
                                <Input
                                    value={newModule}
                                    onChange={(e) => setNewModule(e.target.value)}
                                    placeholder="Module name"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Feature</Label>
                                <Input
                                    value={newFeature}
                                    onChange={(e) => setNewFeature(e.target.value)}
                                    placeholder="Feature name"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Key</Label>
                                <Input
                                    value={newKey}
                                    onChange={(e) => setNewKey(e.target.value)}
                                    placeholder="Key"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Value</Label>
                                <EnhancedEditableJsonViewer
                                    data={newValue}
                                    onChange={setNewValue}
                                />
                            </div>
                        </div>
                        <Button onClick={handleAddItem}>Add Item</Button>
                    </DialogContent>
                </Dialog>
            </div>

            {feedback && (
                <Alert variant={feedback.success ? "default" : "destructive"}>
                    <AlertDescription>{feedback.message}</AlertDescription>
                </Alert>
            )}

            <ConfirmationDialog
                open={confirmDialog.open}
                onOpenChange={(open) => setConfirmDialog(prev => ({...prev, open}))}
                onConfirm={confirmDialog.action}
                title={confirmDialog.title}
                description={confirmDialog.description}
                variant="destructive"
            />

            <Tabs value={selectedModule || 'all'} onValueChange={setSelectedModule}>
                <TabsList className="flex flex-wrap h-auto justify-start bg-card">
                    <TabsTrigger
                        className="border-border border rounded-md m-1 bg-background hover:bg-accent data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                        value="all"
                    >
                        All Modules
                    </TabsTrigger>
                    {modules.map((module) => (
                        <TabsTrigger
                            className="border-border border rounded-md m-1 bg-background hover:bg-accent data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                            key={module}
                            value={module}
                        >
                            {module}
                        </TabsTrigger>
                    ))}
                </TabsList>

                <ScrollArea className="h-[600px] rounded-md border-border border p-4">
                    <AnimatePresence>
                        {Object.entries(items).map(([fullKey, value]) => {
                            const [module, feature, key] = fullKey.split('/');
                            return (
                                <motion.div
                                    key={fullKey}
                                    initial={{opacity: 0, y: 20}}
                                    animate={{opacity: 1, y: 0}}
                                    exit={{opacity: 0, y: -20}}
                                    className="mb-4"
                                >
                                    <Alert className="border-border">
                                        <div className="flex justify-between items-start">
                                            <div className="w-full">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-medium text-foreground">{`${module}/${feature}/${key}`}</p>
                                                    <VerificationBadge status={verificationStatuses[fullKey]}/>
                                                </div>
                                                {editingKey === fullKey ? (
                                                    <div className="mt-2">
                                                        <EnhancedEditableJsonViewer
                                                            data={value}
                                                            onChange={(data) => handleUpdateItem(module, feature, key, data)}
                                                        />
                                                    </div>
                                                ) : (
                                                     <EnhancedJsonViewer data={value}/>
                                                 )}
                                            </div>
                                            <div className="flex gap-2 ml-4">
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => setEditingKey(editingKey === fullKey ? null
                                                                                                        : fullKey)}
                                                    className="hover:bg-accent"
                                                >
                                                    {editingKey === fullKey ? (
                                                        <Save className="h-4 w-4"/>
                                                    ) : (
                                                         <Edit3 className="h-4 w-4"/>
                                                     )}
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    size="icon"
                                                    onClick={() => handleDeleteItem(module, feature, key)}
                                                >
                                                    <Trash2 className="h-4 w-4"/>
                                                </Button>
                                            </div>
                                        </div>
                                    </Alert>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </ScrollArea>
            </Tabs>
        </div>
    );
};


const RawStorageView = ({storage}: { storage: UseLocalStorageManager }) => {
    const [rawData, setRawData] = useState<object>({});
    const [feedback, setFeedback] = useState<StorageVerification | null>(null);
    const [storageSize, setStorageSize] = useState<{ used: number; remaining: number }>();

    const refreshData = async () => {
        try {
            const data = await storage.exportStorageData();
            setRawData(JSON.parse(data));
            const size = await storage.getStorageSize();
            setStorageSize(size);
        } catch (error) {
            setFeedback({
                success: false,
                message: 'Failed to load storage data'
            });
        }
    };

    useEffect(() => {
        refreshData();
        // Set up periodic refresh
        const interval = setInterval(refreshData, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleCopyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(JSON.stringify(rawData, null, 2));
            setFeedback({
                success: true,
                message: 'Copied to clipboard'
            });
        } catch (error) {
            setFeedback({
                success: false,
                message: 'Failed to copy to clipboard'
            });
        }
    };

    const handleDownload = () => {
        try {
            const blob = new Blob([JSON.stringify(rawData, null, 2)], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `localStorage-export-${new Date().toISOString()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setFeedback({
                success: true,
                message: 'Downloaded successfully'
            });
        } catch (error) {
            setFeedback({
                success: false,
                message: 'Failed to download data'
            });
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div className="flex gap-2">
                    <Button onClick={refreshData}>
                        <RefreshCw className="w-4 h-4 mr-2"/>
                        Refresh
                    </Button>
                    <Button onClick={handleCopyToClipboard}>
                        <Copy className="w-4 h-4 mr-2"/>
                        Copy
                    </Button>
                    <Button onClick={handleDownload}>
                        <Download className="w-4 h-4 mr-2"/>
                        Download
                    </Button>
                </div>
                {storageSize && (
                    <div className="text-sm text-muted-foreground">
                        Storage: {(storageSize.used / 1024).toFixed(2)}KB /
                        {(storageSize.remaining / 1024).toFixed(2)}KB remaining
                    </div>
                )}
            </div>

            {feedback && (
                <Alert variant={feedback.success ? "default" : "destructive"}>
                    <AlertDescription>{feedback.message}</AlertDescription>
                </Alert>
            )}

            <div className="border rounded-lg">
                <EnhancedJsonViewer
                    data={rawData}
                    initialExpanded={true}
                    className="p-4"
                />
            </div>
        </div>
    );
};


const CookieManager = ({storage}: { storage: UseLocalStorageManager }) => {
    const [cookies, setCookies] = useState<Record<string, string>>({});
    const [cookieDetails, setCookieDetails] = useState<Record<string, { value: string; options: CookieOptions }>>({});
    const [feedback, setFeedback] = useState<StorageVerification | null>(null);
    const [newCookieDialog, setNewCookieDialog] = useState(false);
    const [verificationStatuses, setVerificationStatuses] = useState<Record<string, VerificationStatus>>({});
    const [confirmDialog, setConfirmDialog] = useState<{
        open: boolean;
        action: () => Promise<void>;
        title: string;
        description: string;
    }>({
        open: false,
        action: async () => {
        },
        title: '',
        description: '',
    });

    const [newCookie, setNewCookie] = useState<CookieDetailView>({
        name: '',
        value: '',
        expires: '',
        path: '/',
        domain: '',
        secure: false,
        sameSite: 'Lax'
    });

    const refreshCookies = async () => {
        const currentCookies = await storage.getCookies();
        setCookies(currentCookies);

        // Load detailed cookie information
        const details: Record<string, { value: string; options: CookieOptions }> = {};
        for (const name of Object.keys(currentCookies)) {
            const cookieDetail = await storage.getCookieDetails(name);
            if (cookieDetail) {
                details[name] = cookieDetail;
                await verifyCookieExists(name);
            }
        }
        setCookieDetails(details);
    };

    const verifyCookieExists = async (name: string) => {
        setVerificationStatuses(prev => ({
            ...prev,
            [name]: {isVerifying: true, status: null}
        }));

        const result = await storage.verifyCookie(name);

        setVerificationStatuses(prev => ({
            ...prev,
            [name]: {isVerifying: false, status: result}
        }));

        return result;
    };

    const handleAddCookie = async () => {
        const {name, value, ...options} = newCookie;
        const result = await storage.setCookie(name, value, options);
        setFeedback(result);
        if (result.success) {
            setNewCookieDialog(false);
            refreshCookies();
            setNewCookie({
                name: '',
                value: '',
                expires: '',
                path: '/',
                domain: '',
                secure: false,
                sameSite: 'Lax'
            });
        }
    };

    const handleRemoveCookie = async (name: string) => {
        setConfirmDialog({
            open: true,
            action: async () => {
                const result = await storage.removeCookie(name);
                setFeedback(result);
                if (result.success) {
                    refreshCookies();
                }
                setConfirmDialog(prev => ({...prev, open: false}));
            },
            title: 'Remove Cookie',
            description: `Are you sure you want to remove the cookie "${name}"?`
        });
    };

    const handleClearAllCookies = async () => {
        setConfirmDialog({
            open: true,
            action: async () => {
                const cookieNames = Object.keys(cookies);
                let success = true;
                for (const name of cookieNames) {
                    const result = await storage.removeCookie(name);
                    if (!result.success) {
                        success = false;
                    }
                }
                setFeedback({
                    success,
                    message: success ? 'All cookies cleared' : 'Some cookies could not be cleared'
                });
                refreshCookies();
                setConfirmDialog(prev => ({...prev, open: false}));
            },
            title: 'Clear All Cookies',
            description: 'Are you sure you want to remove all cookies? This action cannot be undone.'
        });
    };

    useEffect(() => {
        refreshCookies();
    }, []);

    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                <Button onClick={refreshCookies}>
                    <RefreshCw className="w-4 h-4 mr-2"/>
                    Refresh
                </Button>
                <Dialog open={newCookieDialog} onOpenChange={setNewCookieDialog}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="w-4 h-4 mr-2"/>
                            Add Cookie
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New Cookie</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label>Name</Label>
                                <Input
                                    value={newCookie.name}
                                    onChange={(e) => setNewCookie({...newCookie, name: e.target.value})}
                                    placeholder="Cookie name"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Value</Label>
                                <Input
                                    value={newCookie.value}
                                    onChange={(e) => setNewCookie({...newCookie, value: e.target.value})}
                                    placeholder="Cookie value"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Expires</Label>
                                <Input
                                    type="datetime-local"
                                    value={newCookie.expires}
                                    onChange={(e) => setNewCookie({
                                        ...newCookie,
                                        expires: e.target.value
                                    })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Path</Label>
                                <Input
                                    value={newCookie.path}
                                    onChange={(e) => setNewCookie({...newCookie, path: e.target.value})}
                                    placeholder="/"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Domain</Label>
                                <Input
                                    value={newCookie.domain}
                                    onChange={(e) => setNewCookie({...newCookie, domain: e.target.value})}
                                    placeholder="Optional domain"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={newCookie.secure}
                                    onChange={(e) => setNewCookie({...newCookie, secure: e.target.checked})}
                                    id="secure-checkbox"
                                />
                                <Label htmlFor="secure-checkbox">Secure</Label>
                            </div>
                            <div className="grid gap-2">
                                <Label>SameSite</Label>
                                <select
                                    value={newCookie.sameSite}
                                    onChange={(e) => setNewCookie({
                                        ...newCookie,
                                        sameSite: e.target.value as 'Strict' | 'Lax' | 'None'
                                    })}
                                    className="form-select"
                                >
                                    <option value="Lax">Lax</option>
                                    <option value="Strict">Strict</option>
                                    <option value="None">None</option>
                                </select>
                            </div>
                        </div>
                        <Button onClick={handleAddCookie}>Add Cookie</Button>
                    </DialogContent>
                </Dialog>
                <Button variant="destructive" onClick={handleClearAllCookies}>
                    <Trash2 className="w-4 h-4 mr-2"/>
                    Clear All
                </Button>
            </div>

            {feedback && (
                <Alert variant={feedback.success ? "default" : "destructive"}>
                    <AlertDescription>{feedback.message}</AlertDescription>
                </Alert>
            )}

            <ConfirmationDialog
                open={confirmDialog.open}
                onOpenChange={(open) => setConfirmDialog(prev => ({...prev, open}))}
                onConfirm={confirmDialog.action}
                title={confirmDialog.title}
                description={confirmDialog.description}
                variant="destructive"
            />

            <ScrollArea className="h-[600px] rounded-md border p-4">
                <AnimatePresence>
                    {Object.entries(cookieDetails).map(([name, details]) => (
                        <motion.div
                            key={name}
                            initial={{opacity: 0, y: 20}}
                            animate={{opacity: 1, y: 0}}
                            exit={{opacity: 0, y: -20}}
                            className="mb-4"
                        >
                            <Alert>
                                <div className="flex justify-between items-start">
                                    <div className="space-y-2 flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium">{name}</p>
                                            <VerificationBadge status={verificationStatuses[name]}/>
                                        </div>
                                        <AlertDescription>
                                            Value: {details.value}
                                        </AlertDescription>
                                        <CookieDetailsView details={{name, value: details.value, ...details.options}}/>
                                    </div>
                                    <Button
                                        variant="destructive"
                                        size="icon"
                                        onClick={() => handleRemoveCookie(name)}
                                    >
                                        <Trash2 className="h-4 w-4"/>
                                    </Button>
                                </div>
                            </Alert>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </ScrollArea>
        </div>
    );
};

const ImportExport = ({storage}: { storage: UseLocalStorageManager }) => {
    const [feedback, setFeedback] = useState<StorageVerification | null>(null);
    const [importData, setImportData] = useState<object>({});
    const [confirmDialog, setConfirmDialog] = useState<{
        open: boolean;
        action: () => Promise<void>;
        title: string;
        description: string;
    }>({
        open: false,
        action: async () => {
        },
        title: '',
        description: '',
    });

    const handleExport = async () => {
        try {
            const data = await storage.exportStorageData();
            const blob = new Blob([data], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `localStorage-backup-${new Date().toISOString()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setFeedback({
                success: true,
                message: 'Data exported successfully'
            });
        } catch (error) {
            setFeedback({
                success: false,
                message: 'Failed to export data'
            });
        }
    };

    const handleImport = async () => {
        setConfirmDialog({
            open: true,
            action: async () => {
                try {
                    const result = await storage.importStorageData(JSON.stringify(importData));
                    setFeedback(result);
                    if (result.success) {
                        setImportData({});
                    }
                } catch (error) {
                    setFeedback({
                        success: false,
                        message: 'Failed to import data: Invalid format'
                    });
                }
                setConfirmDialog(prev => ({...prev, open: false}));
            },
            title: 'Confirm Import',
            description: 'This will override existing data. Are you sure you want to proceed?'
        });
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const content = e.target?.result as string;
                    setImportData(JSON.parse(content));
                    setFeedback({
                        success: true,
                        message: 'File loaded successfully'
                    });
                } catch (error) {
                    setFeedback({
                        success: false,
                        message: 'Invalid JSON file'
                    });
                }
            };
            reader.readAsText(file);
        }
    };

    return (
        <div className="space-y-4">
            <div className="grid gap-4">
                <div className="space-y-2">
                    <h3 className="text-lg font-medium">Export Data</h3>
                    <p className="text-sm text-muted-foreground">
                        Download a backup of all your localStorage data
                    </p>
                    <Button onClick={handleExport}>
                        <Download className="w-4 h-4 mr-2"/>
                        Export Data
                    </Button>
                </div>

                <div className="space-y-2">
                    <h3 className="text-lg font-medium">Import Data</h3>
                    <p className="text-sm text-muted-foreground">
                        Import data from a backup file or paste JSON directly
                    </p>
                    <div className="flex gap-2">
                        <Input
                            type="file"
                            accept=".json"
                            onChange={handleFileUpload}
                        />
                        <Button onClick={handleImport}>
                            <Upload className="w-4 h-4 mr-2"/>
                            Import
                        </Button>
                    </div>
                    <div className="mt-4">
                        <Label>Or paste JSON data:</Label>
                        <EnhancedEditableJsonViewer
                            data={importData}
                            onChange={setImportData}
                            className="mt-2"
                        />
                    </div>
                </div>
            </div>

            {feedback && (
                <Alert variant={feedback.success ? "default" : "destructive"}>
                    <AlertDescription>{feedback.message}</AlertDescription>
                </Alert>
            )}

            <ConfirmationDialog
                open={confirmDialog.open}
                onOpenChange={(open) => setConfirmDialog(prev => ({...prev, open}))}
                onConfirm={confirmDialog.action}
                title={confirmDialog.title}
                description={confirmDialog.description}
                variant="destructive"
            />
        </div>
    );
};

export function LocalStorageAdmin() {
    const storage = useLocalStorageManager();
    const [storageSize, setStorageSize] = useState<{ used: number; remaining: number }>();
    const [feedback, setFeedback] = useState<StorageVerification | null>(null);

    const refreshStorageSize = async () => {
        try {
            const size = await storage.getStorageSize();
            setStorageSize(size);
        } catch (error) {
            setFeedback({
                success: false,
                message: 'Failed to get storage size'
            });
        }
    };

    useEffect(() => {
        refreshStorageSize();
        // Refresh storage size periodically
        const interval = setInterval(refreshStorageSize, 10000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="w-full p-3">
            {storageSize && (
                <div className="mb-4 flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                        Storage Usage: {(storageSize.used / 1024).toFixed(2)}KB
                    </div>
                    <div className="text-sm text-muted-foreground">
                        Remaining: {(storageSize.remaining / 1024).toFixed(2)}KB
                    </div>
                    <div
                        className="w-32 h-2 bg-secondary rounded-full overflow-hidden"
                        title={`${((storageSize.used / (storageSize.used + storageSize.remaining)) * 100).toFixed(1)}% used`}
                    >
                        <div
                            className="h-full bg-primary"
                            style={{
                                width: `${(storageSize.used / (storageSize.used + storageSize.remaining)) * 100}%`
                            }}
                        />
                    </div>
                </div>
            )}

            {feedback && (
                <Alert
                    variant={feedback.success ? "default" : "destructive"}
                    className="mb-4"
                >
                    <AlertDescription>{feedback.message}</AlertDescription>
                </Alert>
            )}

            <Tabs defaultValue="storage" className="w-full">
                <TabsList className="flex flex-wrap h-auto justify-start bg-card">
                    <TabsTrigger className="border-border border rounded-md m-1 bg-background hover:bg-accent data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" value="storage">Storage Manager</TabsTrigger>
                    <TabsTrigger
                        className="border-border border rounded-md m-1 bg-background hover:bg-accent data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                        value="raw">Raw Storage</TabsTrigger>
                    <TabsTrigger
                        className="border-border border rounded-md m-1 bg-background hover:bg-accent data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                        value="cookies">Cookie Manager</TabsTrigger>
                    <TabsTrigger
                        className="border-border border rounded-md m-1 bg-background hover:bg-accent data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                        value="import-export">Import/Export</TabsTrigger>
                </TabsList>

                <TabsContent value="storage" className="mt-4">
                    <StorageManager
                        storage={storage}
                        onRefresh={refreshStorageSize}
                    />
                </TabsContent>

                <TabsContent value="raw" className="mt-4">
                    <RawStorageView storage={storage}/>
                </TabsContent>

                <TabsContent value="cookies" className="mt-4">
                    <CookieManager storage={storage}/>
                </TabsContent>

                <TabsContent value="import-export" className="mt-4">
                    <ImportExport storage={storage}/>
                </TabsContent>
            </Tabs>
        </div>
    );
}

// Type exports
export type {
    StorageVerification,
    CookieOptions,
    CookieDetailView,
    VerificationStatus
};


export default LocalStorageAdmin;
