import React, { useState } from 'react';
import { LogIn, Eye, EyeOff, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useChat, type AuthCredentials } from '@/contexts/ChatContext';
import config from '@/config';

const AuthForm: React.FC = () => {
  const [credentials, setCredentials] = useState<AuthCredentials>({
    envUrl: config.incorta.defaultEnvUrl,
    tenant: config.incorta.defaultTenant,
    accessToken: '',
    sqlxHost: config.incorta.defaultSqlxHost,
    incortaUsername: config.incorta.defaultUsername
  });
  const [showToken, setShowToken] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { authenticate, isConnected, isAuthenticated, connectionStatus } = useChat();

  const handleInputChange = (field: keyof AuthCredentials) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setCredentials(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if access token is provided (main requirement)
    if (!credentials.accessToken.trim()) {
      alert('Access Token is required');
      return;
    }

    setIsSubmitting(true);
    authenticate(credentials);
    
    // Reset submitting state after delay
    setTimeout(() => {
      setIsSubmitting(false);
    }, 3000);
  };

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return isAuthenticated ? 
          <CheckCircle className="h-4 w-4 text-green-500" /> : 
          <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'connecting':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'error':
      case 'disconnected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <XCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getConnectionStatusText = () => {
    if (isAuthenticated) return 'Connected & Authenticated';
    if (isConnected) return 'Connected - Please authenticate';
    switch (connectionStatus) {
      case 'connecting': return 'Connecting...';
      case 'error': return 'Connection failed';
      case 'disconnected': return 'Disconnected';
      default: return 'Not connected';
    }
  };

  const getConnectionStatusColor = () => {
    if (isAuthenticated) return 'text-green-600 bg-green-50 border-green-200';
    if (isConnected) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (connectionStatus === 'connecting') return 'text-blue-600 bg-blue-50 border-blue-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  // If already authenticated, show success message
  if (isAuthenticated) {
    return (
      <div className="w-full max-w-md mx-auto mt-8 mb-6">
        <Alert className={getConnectionStatusColor()}>
          <div className="flex items-center gap-2">
            {getConnectionStatusIcon()}
            <AlertDescription>
              Successfully authenticated! You can now start chatting and uploading files.
            </AlertDescription>
          </div>
        </Alert>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <Card className="w-full max-w-md mx-auto mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getConnectionStatusIcon()}
            Connection Status
          </CardTitle>
          <CardDescription>
            {getConnectionStatusText()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
          <Alert className={getConnectionStatusColor()}>
            <AlertDescription>
              Connecting to Incorta MCP WebSocket server at {config.websocket.url}...
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LogIn className="h-5 w-5" />
          Incorta Authentication
        </CardTitle>
        <CardDescription>
          Enter your Incorta credentials to access the MCP service
        </CardDescription>
        <Alert className={getConnectionStatusColor()}>
          <div className="flex items-center gap-2">
            {getConnectionStatusIcon()}
            <AlertDescription>
              {getConnectionStatusText()}
            </AlertDescription>
          </div>
        </Alert>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="envUrl">Environment URL</Label>
            <Input
              id="envUrl"
              type="url"
              placeholder="https://your-env.incorta.com/incorta/api/v2"
              value={credentials.envUrl}
              onChange={handleInputChange('envUrl')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tenant">Tenant</Label>
            <Input
              id="tenant"
              type="text"
              placeholder="default"
              value={credentials.tenant}
              onChange={handleInputChange('tenant')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="accessToken">Access Token *</Label>
            <div className="relative">
              <Input
                id="accessToken"
                type={showToken ? "text" : "password"}
                placeholder="Enter your access token (required)"
                value={credentials.accessToken}
                onChange={handleInputChange('accessToken')}
                required
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowToken(!showToken)}
              >
                {showToken ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sqlxHost">SQLX Host</Label>
            <Input
              id="sqlxHost"
              type="text"
              placeholder="jdbc:hive2://..."
              value={credentials.sqlxHost}
              onChange={handleInputChange('sqlxHost')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="incortaUsername">Username</Label>
            <Input
              id="incortaUsername"
              type="text"
              placeholder="admin"
              value={credentials.incortaUsername}
              onChange={handleInputChange('incortaUsername')}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full"
            disabled={!isConnected || isSubmitting || !credentials.accessToken.trim()}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Authenticating...
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4 mr-2" />
                Authenticate
              </>
            )}
          </Button>
          
          <div className="text-sm text-gray-600">
            <p>* Access Token is required. Other fields are pre-filled with defaults.</p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default AuthForm;
