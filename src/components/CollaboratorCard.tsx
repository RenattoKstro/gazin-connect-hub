import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, MessageCircle, Instagram, User } from "lucide-react";

export interface Collaborator {
  id: string;
  name: string;
  position: string;
  phone: string;
  photo?: string;
  instagram?: string;
  observations?: string;
}

interface CollaboratorCardProps {
  collaborator: Collaborator;
}

export const CollaboratorCard = ({ collaborator }: CollaboratorCardProps) => {
  const handleWhatsAppClick = () => {
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
    <Card className="shadow-card hover:shadow-elegant transition-all duration-300 hover:scale-[1.02] border-border/40">
      <CardContent className="p-6">
        <div className="flex items-start space-x-4">
          <Avatar className="w-16 h-16 border-2 border-primary/20">
            <AvatarImage src={collaborator.photo} alt={collaborator.name} />
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
            
            <div className="flex items-center text-muted-foreground mb-4">
              <Phone className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="text-sm">{collaborator.phone}</span>
            </div>

            {collaborator.observations && (
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {collaborator.observations}
              </p>
            )}

            <div className="flex gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={handleWhatsAppClick}
                className="flex-1 bg-gradient-primary hover:opacity-90 transition-opacity"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                WhatsApp
              </Button>

              {collaborator.instagram && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleInstagramClick}
                  className="border-primary/30 text-primary hover:bg-primary/10"
                >
                  <Instagram className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};