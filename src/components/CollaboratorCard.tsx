import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, MessageCircle, Instagram, User } from "lucide-react";

export interface Collaborator {
  id: string;
  name: string;
  position: string;
  phone: string | null;
  photo_url: string | null;
  instagram: string | null;
  observations: string | null;
  on_vacation: boolean;
}

interface CollaboratorCardProps {
  collaborator: Collaborator;
}

export const CollaboratorCard = ({ collaborator }: CollaboratorCardProps) => {
  const handleWhatsAppClick = () => {
    if (!collaborator.phone) return;
    const phoneNumber = collaborator.phone.replace(/\D/g, '');
    const message = `Olá ${collaborator.name}!`;
    const whatsappUrl = `https://wa.me/55${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleInstagramClick = () => {
    if (collaborator.instagram) {
      const instagramUrl = collaborator.instagram.startsWith('http') 
        ? collaborator.instagram 
        : `https://instagram.com/${collaborator.instagram.replace('@', '')}`;
      window.open(instagramUrl, '_blank');
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="relative">
      <Card 
        className={`shadow-card transition-all duration-300 border-border/40 ${
          collaborator.on_vacation 
            ? 'opacity-50 pointer-events-none' 
            : 'hover:shadow-elegant hover:scale-[1.02]'
        }`}
      >
        {collaborator.on_vacation && (
          <div className="absolute top-2 right-2 z-10 bg-yellow-500 text-yellow-900 px-2 py-1 rounded text-xs font-bold">
            FÉRIAS
          </div>
        )}
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <Avatar className="w-16 h-16 border-2 border-primary/20">
              <AvatarImage src={collaborator.photo_url || undefined} alt={collaborator.name} />
              <AvatarFallback className="bg-gradient-primary text-primary-foreground font-semibold text-lg">
                {getInitials(collaborator.name)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg text-card-foreground mb-1 truncate">
                {collaborator.name}
              </h3>
              <p className="text-primary font-medium mb-3">
                {collaborator.position}
              </p>
              
              {collaborator.phone && (
                <div className="flex items-center text-muted-foreground mb-4">
                  <Phone className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span className="text-sm">{collaborator.phone}</span>
                </div>
              )}

              {collaborator.observations && (
                <div className="text-sm text-muted-foreground mb-4 whitespace-pre-wrap">
                  {collaborator.observations}
                </div>
              )}

              <div className="flex gap-2">
                {collaborator.phone && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleWhatsAppClick}
                    disabled={collaborator.on_vacation}
                    className="flex-1 bg-gradient-primary hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    WhatsApp
                  </Button>
                )}

                {collaborator.instagram && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleInstagramClick}
                    disabled={collaborator.on_vacation}
                    className="border-primary/30 text-primary hover:bg-primary/10 disabled:opacity-50"
                  >
                    <Instagram className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};