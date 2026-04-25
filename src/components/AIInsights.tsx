import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { BrainCircuit, Sparkles, Loader2, TrendingUp, ShieldAlert } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, getDocs, query, limit, orderBy } from 'firebase/firestore';
import { motion } from 'motion/react';

export default function AIInsights() {
  const [loading, setLoading] = useState(false);
  const [insight, setInsight] = useState<string | null>(null);

  const generateInsights = async () => {
    setLoading(true);
    try {
      // Fetch some context data
      const invSnap = await getDocs(collection(db, 'inventory'));
      const logsSnap = await getDocs(query(collection(db, 'farmlogs'), orderBy('timestamp', 'desc'), limit(10)));
      
      const inventory = invSnap.docs.map(d => d.data());
      const logs = logsSnap.docs.map(d => d.data());

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `
        As a poultry farm expert, analyze the following data and provide 3 actionable insights for the farm owner.
        Keep it professional, concise, and helpful.
        
        Inventory: ${JSON.stringify(inventory)}
        Recent Logs: ${JSON.stringify(logs)}
        
        Format the output as a clean list of insights with a short title for each.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      setInsight(response.text || "Unable to generate insights at this time.");
    } catch (error) {
      console.error('AI Insight error:', error);
      setInsight("Error connecting to AI service. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-orange-100 rounded-3xl flex items-center justify-center text-orange-600 mx-auto">
          <BrainCircuit size={32} />
        </div>
        <h2 className="text-3xl font-bold tracking-tight">AI Farm Advisor</h2>
        <p className="text-stone-500 max-w-lg mx-auto">
          Get personalized recommendations for your farm based on your inventory and activity logs.
        </p>
        <Button 
          onClick={generateInsights} 
          disabled={loading}
          className="rounded-full px-8 bg-stone-900 hover:bg-stone-800 text-white h-12"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing Data...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Insights
            </>
          )}
        </Button>
      </div>

      {insight && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="rounded-[2rem] border-stone-200 shadow-lg overflow-hidden bg-white">
            <CardHeader className="bg-stone-50 border-b border-stone-100 p-8">
              <CardTitle className="flex items-center gap-2 text-xl">
                <TrendingUp className="text-green-600" />
                Your Action Plan
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="prose prose-stone max-w-none whitespace-pre-wrap text-stone-700 leading-relaxed">
                {insight}
              </div>
              <div className="mt-8 pt-8 border-t border-stone-100 flex items-center gap-3 text-stone-400 text-xs italic">
                <ShieldAlert size={14} />
                AI insights are recommendations based on data. Always consult a veterinarian for critical health decisions.
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {!insight && !loading && (
        <div className="grid md:grid-cols-2 gap-6 opacity-50 grayscale">
          <Card className="rounded-3xl border-dashed border-2 border-stone-200">
            <CardContent className="p-8 text-center">
              <div className="w-10 h-10 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp size={20} className="text-stone-400" />
              </div>
              <div className="h-4 w-3/4 bg-stone-100 rounded mx-auto mb-2"></div>
              <div className="h-4 w-1/2 bg-stone-100 rounded mx-auto"></div>
            </CardContent>
          </Card>
          <Card className="rounded-3xl border-dashed border-2 border-stone-200">
            <CardContent className="p-8 text-center">
              <div className="w-10 h-10 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldAlert size={20} className="text-stone-400" />
              </div>
              <div className="h-4 w-3/4 bg-stone-100 rounded mx-auto mb-2"></div>
              <div className="h-4 w-1/2 bg-stone-100 rounded mx-auto"></div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
