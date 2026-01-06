import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Database, Cloud, HardDrive, Check, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/components/ThemeProvider";
import { getStorageConfig, updateStorageConfig } from "@/lib/api";
import { toast } from "sonner";

export default function SettingsPage() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  
  const [storageConfig, setStorageConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [provider, setProvider] = useState("local");
  const [s3Config, setS3Config] = useState({
    bucket_name: "",
    access_key: "",
    secret_key: "",
    region: "us-east-1"
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const config = await getStorageConfig();
      setStorageConfig(config);
      setProvider(config.provider);
    } catch (error) {
      console.error("Failed to load storage config:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStorage = async () => {
    setSaving(true);
    try {
      const config = {
        provider,
        s3_bucket_name: provider === 's3' ? s3Config.bucket_name : null,
        s3_access_key: provider === 's3' ? s3Config.access_key : null,
        s3_secret_key: provider === 's3' ? s3Config.secret_key : null,
        s3_region: provider === 's3' ? s3Config.region : null
      };
      
      const result = await updateStorageConfig(config);
      toast.success("Storage configuration updated");
      
      // Show instructions
      if (provider === 's3') {
        toast.info("Server restart required to apply S3 configuration", {
          duration: 5000
        });
      }
    } catch (error) {
      toast.error("Failed to update storage configuration");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 overflow-auto" data-testid="settings-page">
      <div className="max-w-2xl mx-auto p-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(-1)}
            data-testid="back-btn"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-serif text-2xl font-semibold">Settings</h1>
        </div>

        {/* Appearance */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Appearance</CardTitle>
            <CardDescription>Customize the look and feel</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Dark Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Toggle between light and dark themes
                </p>
              </div>
              <Switch
                checked={theme === "dark"}
                onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                data-testid="theme-switch"
              />
            </div>
          </CardContent>
        </Card>

        {/* Storage Configuration */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Database className="h-5 w-5" />
              File Storage
            </CardTitle>
            <CardDescription>
              Configure where your knowledge base files are stored
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Current Status */}
            {storageConfig && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Current Configuration</AlertTitle>
                <AlertDescription>
                  Storage provider: <strong>{storageConfig.provider}</strong>
                  {storageConfig.provider === 'local' && storageConfig.local_path && (
                    <span className="block text-xs mt-1">Path: {storageConfig.local_path}</span>
                  )}
                  {storageConfig.provider === 's3' && storageConfig.s3_configured && (
                    <span className="block text-xs mt-1">S3 bucket configured</span>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Provider Selection */}
            <RadioGroup value={provider} onValueChange={setProvider} className="space-y-3">
              <div className="flex items-start space-x-3 p-4 rounded-lg border border-border hover:border-primary/50 transition-colors">
                <RadioGroupItem value="local" id="local" className="mt-1" data-testid="storage-local" />
                <Label htmlFor="local" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2 mb-1">
                    <HardDrive className="h-4 w-4" />
                    <span className="font-medium">Local Storage</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Files stored on the server filesystem. Good for development and testing.
                  </p>
                </Label>
              </div>
              
              <div className="flex items-start space-x-3 p-4 rounded-lg border border-border hover:border-primary/50 transition-colors">
                <RadioGroupItem value="s3" id="s3" className="mt-1" data-testid="storage-s3" />
                <Label htmlFor="s3" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2 mb-1">
                    <Cloud className="h-4 w-4" />
                    <span className="font-medium">Amazon S3</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Store files in your company's S3 bucket for production use and security compliance.
                  </p>
                </Label>
              </div>
            </RadioGroup>

            {/* S3 Configuration */}
            {provider === 's3' && (
              <div className="space-y-4 p-4 rounded-lg bg-secondary/50 animate-fadeIn">
                <h4 className="font-medium text-sm">S3 Configuration</h4>
                
                <div className="space-y-2">
                  <Label htmlFor="bucket">Bucket Name</Label>
                  <Input
                    id="bucket"
                    value={s3Config.bucket_name}
                    onChange={(e) => setS3Config({ ...s3Config, bucket_name: e.target.value })}
                    placeholder="my-company-bucket"
                    data-testid="s3-bucket-input"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="region">Region</Label>
                  <Input
                    id="region"
                    value={s3Config.region}
                    onChange={(e) => setS3Config({ ...s3Config, region: e.target.value })}
                    placeholder="us-east-1"
                    data-testid="s3-region-input"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="access_key">Access Key ID</Label>
                  <Input
                    id="access_key"
                    value={s3Config.access_key}
                    onChange={(e) => setS3Config({ ...s3Config, access_key: e.target.value })}
                    placeholder="AKIAIOSFODNN7EXAMPLE"
                    data-testid="s3-access-key-input"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="secret_key">Secret Access Key</Label>
                  <Input
                    id="secret_key"
                    type="password"
                    value={s3Config.secret_key}
                    onChange={(e) => setS3Config({ ...s3Config, secret_key: e.target.value })}
                    placeholder="••••••••••••••••"
                    data-testid="s3-secret-key-input"
                  />
                </div>
                
                <Alert className="mt-4">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Your S3 credentials are stored securely as environment variables on the server.
                    The bucket should have appropriate IAM permissions for read/write operations.
                  </AlertDescription>
                </Alert>
              </div>
            )}

            <Button 
              onClick={handleSaveStorage} 
              disabled={saving}
              className="w-full"
              data-testid="save-storage-btn"
            >
              {saving ? "Saving..." : "Save Storage Configuration"}
            </Button>
          </CardContent>
        </Card>

        {/* About */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">About</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>Assessment Editor</strong></p>
              <p>A Claude Projects clone for editing assessment materials with AI assistance.</p>
              <p className="text-xs mt-4">
                Built with React, FastAPI, MongoDB, and Claude Sonnet 4.5
              </p>
              <p className="text-xs">
                Storage: Configurable (Local/S3) for enterprise deployment
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export { SettingsPage };
