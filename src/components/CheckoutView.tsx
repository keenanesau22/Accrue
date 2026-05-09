import React, { useState } from 'react';
import { User, CreditCard, ShoppingCart, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';
import LegalModal, { LegalType } from './LegalModal';

interface CheckoutViewProps {
  onComplete: () => void;
  isLoading: boolean;
  title?: string;
}

const CheckoutView: React.FC<CheckoutViewProps> = ({ onComplete, isLoading, title = "Complete your subscription" }) => {
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [activeLegal, setActiveLegal] = useState<LegalType>(null);
  const [formData, setFormData] = useState({
    cardName: '',
    cardNumber: '',
    expiry: '',
    cvv: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'cardNumber') {
      const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
      const parts = [];
      for (let i = 0, len = v.length; i < len; i += 4) {
        parts.push(v.substring(i, i + 4));
      }
      setFormData({ ...formData, [name]: parts.join(' ') });
      return;
    }
    if (name === 'expiry') {
      const v = value.replace(/[^0-9]/gi, '');
      if (v.length <= 4) {
        const part1 = v.substring(0, 2);
        const part2 = v.substring(2, 4);
        setFormData({ ...formData, [name]: part1 + (part2 ? '/' + part2 : '') });
        return;
      }
    }
    if (name === 'cvv') {
      if (value.length <= 4) setFormData({ ...formData, [name]: value.replace(/[^0-9]/gi, '') });
      return;
    }
    setFormData({ ...formData, [name]: value });
  };

  return (
    <div className="space-y-10 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <LegalModal type={activeLegal} onClose={() => setActiveLegal(null)} />
      
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-fredoka font-bold text-gray-800">Secure Checkout</h2>
        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{title}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 items-start">
        {/* Payment Form */}
        <div className="lg:col-span-3 space-y-6">
          <div className="space-y-4">
            <div className="relative group">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-emerald-500 transition-colors" size={20} />
              <input
                required
                name="cardName"
                placeholder="Name on Card"
                value={formData.cardName}
                onChange={handleInputChange}
                className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-12 py-4 font-bold text-black focus:outline-none focus:border-emerald-500 transition-all"
              />
            </div>
            <div className="relative group">
              <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-emerald-500 transition-colors" size={20} />
              <input
                required
                name="cardNumber"
                placeholder="Card Number"
                maxLength={19}
                value={formData.cardNumber}
                onChange={handleInputChange}
                className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-12 py-4 font-bold text-black focus:outline-none focus:border-emerald-500 transition-all"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <input
                required
                name="expiry"
                placeholder="MM / YY"
                maxLength={5}
                value={formData.expiry}
                onChange={handleInputChange}
                className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 py-4 font-bold text-black focus:outline-none focus:border-emerald-500 transition-all text-center"
              />
              <input
                required
                name="cvv"
                placeholder="CVV"
                maxLength={4}
                value={formData.cvv}
                onChange={handleInputChange}
                className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 py-4 font-bold text-black focus:outline-none focus:border-emerald-500 transition-all text-center"
              />
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="mt-1">
                <input 
                  type="checkbox" 
                  checked={agreedToTerms} 
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer" 
                />
              </div>
              <span className="text-xs text-gray-500 leading-relaxed font-medium">
                I agree to the <button type="button" onClick={() => setActiveLegal('tos')} className="text-emerald-600 underline font-bold">Terms of Service</button>, <button type="button" onClick={() => setActiveLegal('privacy')} className="text-emerald-600 underline font-bold">Privacy Policy</button>, and understand that I will be charged <span className="text-gray-800 font-bold">$10.00/month</span> until I cancel.
              </span>
            </label>
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-gray-50 rounded-[2.5rem] p-6 border-2 border-gray-100">
            <h4 className="font-fredoka font-bold text-gray-800 mb-6 flex items-center gap-2">
              <ShoppingCart size={18} className="text-emerald-500" /> Order Summary
            </h4>
            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 font-bold">Accrue Pro Monthly</span>
                <span className="text-gray-800 font-black">$10.00</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 font-bold">Pro Welcome Bonus (500 Gems)</span>
                <span className="text-emerald-500 font-black">FREE</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 font-bold">Sales Tax (0%)</span>
                <span className="text-gray-800 font-black">$0.00</span>
              </div>
            </div>
            <div className="pt-4 border-t border-gray-200 flex justify-between items-center">
              <span className="text-lg font-fredoka font-bold text-gray-800">Total Due</span>
              <span className="text-2xl font-black text-emerald-600">$10.00</span>
            </div>
          </div>

          <button
            onClick={onComplete}
            disabled={isLoading || !agreedToTerms || !formData.cardName || formData.cardNumber.length < 15}
            className="w-full bg-emerald-500 text-white font-black py-5 rounded-2xl shadow-[0_6px_0_#059669] hover:-translate-y-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 className="animate-spin" /> : <>COMPLETE PURCHASE <ArrowRight /></>}
          </button>
          
          <div className="pt-6 border-t border-gray-50 flex items-center gap-3 text-gray-400 text-[10px] uppercase font-black tracking-widest justify-center">
            <ShieldCheck size={18} className="text-emerald-400" />
            <p>SSL SECURED PAYMENT</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutView;