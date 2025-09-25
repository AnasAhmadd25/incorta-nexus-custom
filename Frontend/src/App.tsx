import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, BrowserRouter } from "react-router-dom";
import { ConfigProvider } from 'antd';
import IntlProviderWrapper from './components/IntlProviderWrapper';
import { ChatProvider } from "@/contexts/ChatContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import FullScreenChatInterface from './components/FullScreenChatInterface';
import NotFound from "@/pages/NotFound";
import 'antd/dist/reset.css';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ConfigProvider
          theme={{
            token: {
              colorPrimary: '#37517e',
              borderRadius: 6,
            },
          }}
        >
          <IntlProviderWrapper>
            <ThemeProvider>
              <ChatProvider>
                <BrowserRouter>
                  <Toaster />
                  <Sonner />
                  <Routes>
                    <Route path="/" element={<FullScreenChatInterface />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </BrowserRouter>
              </ChatProvider>
            </ThemeProvider>
          </IntlProviderWrapper>
        </ConfigProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;