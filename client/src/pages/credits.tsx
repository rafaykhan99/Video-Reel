import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coins, CreditCard, History, Star } from "lucide-react";
import { formatDate } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { loadStripe } from "@stripe/stripe-js";

// Load Stripe
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  priceUsd: number;
  bonusCredits: number;
  popular: boolean;
}

interface CreditTransaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  createdAt: string;
}

interface CreditsData {
  balance: number;
  transactions: CreditTransaction[];
}

export default function Credits() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: creditsData, isLoading: creditsLoading } = useQuery<CreditsData>({
    queryKey: ["/api/credits"],
  });

  const { data: packages, isLoading: packagesLoading } = useQuery<CreditPackage[]>({
    queryKey: ["/api/credits/packages"],
  });

  const purchaseMutation = useMutation({
    mutationFn: async (packageId: string) => {
      const response = await apiRequest("POST", "/api/credits/create-payment-intent", { packageId });
      return response.json();
    },
    onSuccess: async (data) => {
      // Handle mock success for development
      if (data.mockSuccess) {
        toast({
          title: "Credits Purchased!",
          description: `Successfully purchased ${data.packageInfo.name}. Your credits have been added to your account.`,
        });
        
        // Refresh credit balance and packages
        queryClient.invalidateQueries({ queryKey: ["/api/credits"] });
        queryClient.invalidateQueries({ queryKey: ["/api/credits/packages"] });
        return;
      }

      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error('Stripe failed to load');
      }

      const { error } = await stripe.redirectToCheckout({
        sessionId: data.sessionId,
      });

      if (error) {
        toast({
          title: "Payment Error",
          description: error.message,
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Purchase Failed",
        description: error.message || "Failed to initiate payment",
        variant: "destructive",
      });
    },
  });

  const handlePurchase = (packageId: string) => {
    purchaseMutation.mutate(packageId);
  };

  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const formatCredits = (credits: number) => `${credits} credits`;

  if (creditsLoading || packagesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2" data-testid="heading-credits">Credits & Billing</h1>
        <p className="text-muted-foreground">
          Manage your credits and purchase additional ones for video generation
        </p>
      </div>

      {/* Current Balance */}
      <Card className="mb-8" data-testid="card-balance">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Current Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-primary" data-testid="text-balance">
            {creditsData?.balance || 0} credits
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            ≈ ${((creditsData?.balance || 0) * 0.002).toFixed(3)} USD value
          </p>
        </CardContent>
      </Card>

      {/* Credit Packages */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4" data-testid="heading-packages">Purchase Credits</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packages?.map((pkg) => (
            <Card key={pkg.id} className={`relative ${pkg.popular ? 'border-primary' : ''}`} data-testid={`card-package-${pkg.id}`}>
              {pkg.popular && (
                <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2" data-testid="badge-popular">
                  <Star className="h-3 w-3 mr-1" />
                  Most Popular
                </Badge>
              )}
              <CardHeader className="text-center">
                <CardTitle>{pkg.name}</CardTitle>
                <CardDescription>
                  <div className="text-2xl font-bold">{formatPrice(pkg.priceUsd)}</div>
                  {pkg.bonusCredits > 0 && (
                    <div className="text-sm text-green-600 mt-1">
                      +{pkg.bonusCredits} bonus credits!
                    </div>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-lg font-semibold">
                    {formatCredits(pkg.credits + pkg.bonusCredits)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {pkg.bonusCredits > 0 && (
                      <>
                        {formatCredits(pkg.credits)} base + {formatCredits(pkg.bonusCredits)} bonus
                      </>
                    )}
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>
                    ~{Math.floor((pkg.credits + pkg.bonusCredits) / 15)} simple videos
                  </div>

                </div>

                <Button 
                  className="w-full" 
                  variant={pkg.popular ? "default" : "outline"}
                  data-testid={`button-purchase-${pkg.id}`}
                  onClick={() => handlePurchase(pkg.id)}
                  disabled={purchaseMutation.isPending}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  {purchaseMutation.isPending ? "Processing..." : "Purchase Credits"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>



      {/* Transaction History */}
      <Card data-testid="card-transactions">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Recent Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {creditsData?.transactions?.length ? (
            <div className="space-y-3">
              {creditsData.transactions.map((transaction) => (
                <div 
                  key={transaction.id} 
                  className="flex items-center justify-between p-3 border rounded-lg"
                  data-testid={`transaction-${transaction.id}`}
                >
                  <div>
                    <div className="font-medium">{transaction.description}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(new Date(transaction.createdAt), "MMM d, yyyy 'at' h:mm a")}
                    </div>
                  </div>
                  <div className={`font-semibold ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {transaction.amount > 0 ? '+' : ''}{transaction.amount} credits
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No transactions yet</p>
              <p className="text-sm">Your credit purchases and usage will appear here</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}