import { useState } from 'react';
import { Bot, Send, X, Loader2 } from 'lucide-react';
import { aiResearchService } from '../services/aiResearchService';

export function AIAssistant({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const userQuery = query;
    setQuery('');
    setMessages(prev => [...prev, { role: 'user', content: userQuery }]);
    setIsLoading(true);

    const response = await aiResearchService.researchTopic(userQuery);
    
    setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    setIsLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 bottom-0 w-[400px] bg-slate-900 border-l border-slate-800 flex flex-col z-50 shadow-2xl">
      <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
        <div className="flex items-center gap-2 text-primary font-bold text-slate-100">
          <Bot className="w-5 h-5" />
          <span>IA Research Assistant</span>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-slate-500 mt-10">
            <Bot className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Faça perguntas técnicas para ajudar na construção do seu roadmap (Ex: EoL do Windows 10, alternativas open-source).</p>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`p-3 rounded-lg text-sm whitespace-pre-wrap ${m.role === 'user' ? 'bg-primary text-primary-foreground ml-8 shadow-sm' : 'bg-slate-800 text-slate-200 mr-8 border border-slate-700'}`}>
              {m.content}
            </div>
          ))
        )}
        {isLoading && (
          <div className="bg-slate-800 text-slate-200 mr-8 p-3 rounded-lg w-fit flex items-center gap-2 border border-slate-700">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span className="text-xs font-semibold">Pesquisando...</span>
          </div>
        )}
      </div>

      <div className="p-4 bg-slate-950 border-t border-slate-800">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pergunte algo..."
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            disabled={isLoading}
          />
          <button 
            type="submit" 
            disabled={isLoading || !query.trim()}
            className="bg-primary text-primary-foreground p-2 rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </form>
      </div>
    </div>
  );
}
