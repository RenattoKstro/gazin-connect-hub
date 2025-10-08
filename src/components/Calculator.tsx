import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { calculateProfitPercentage, calculateSalePrice } from "@/utils/calculations";
import { Moon, Sun, Calculator as CalculatorIcon, Info, Table as TableIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Rentability {
  Linha: string;
  AV: string;
  "12x Cartao": string;
  "12x Carteira": string;
}

// Dados de rentabilidade para Acre (AC)
const acTableData: Rentability[] = [
  { Linha: "101 - ELETRO", AV: "37,67%", "12x Cartao": "40,88%", "12x Carteira": "45,02%" },
  { Linha: "102 - VIDEO", AV: "30,41%", "12x Cartao": "34,01%", "12x Carteira": "38,63%" },
  { Linha: "103 - MOVEIS", AV: "67,33%", "12x Cartao": "69,02%", "12x Carteira": "71,19%" },
  { Linha: "105 - INFORMATICA", AV: "26,49%", "12x Cartao": "30,28%", "12x Carteira": "35,16%" },
  { Linha: "106 - TELECOM", AV: "28,92%", "12x Cartao": "32,59%", "12x Carteira": "37,31%" },
  { Linha: "107 - PORTATEIS", AV: "42,16%", "12x Cartao": "45,15%", "12x Carteira": "48,99%" },
  { Linha: "108 - LAZER", AV: "59,31%", "12x Cartao": "61,41%", "12x Carteira": "64,11%" },
  { Linha: "110 - UTIL. E PRESENTES", AV: "52,54%", "12x Cartao": "54,99%", "12x Carteira": "58,14%" },
  { Linha: "113 - BRINQUEDOS", AV: "54,70%", "12x Cartao": "57,03%", "12x Carteira": "60,04%" },
  { Linha: "123 - VENTILAÇÃO", AV: "38,02%", "12x Cartao": "41,22%", "12x Carteira": "45,33%" },
  { Linha: "124 - CLIMATIZAÇÃO", AV: "32,15%", "12x Cartao": "35,65%", "12x Carteira": "40,15%" },
  { Linha: "125 - AUDIO", AV: "35,46%", "12x Cartao": "38,79%", "12x Carteira": "43,08%" },
  { Linha: "201 - COLCHOES GAZIN", AV: "66,77%", "12x Cartao": "68,48%", "12x Carteira": "70,69%" },
  { Linha: "210 - ESTOFADOS GAZIN", AV: "66,31%", "12x Cartao": "68,05%", "12x Carteira": "70,29%" },
  { Linha: "908 - AUTOMOTIVO", AV: "25,23%", "12x Cartao": "29,08%", "12x Carteira": "34,05%" },
];

// Dados de rentabilidade para Rondônia (RO)
const roTableData: Rentability[] = [
  { Linha: "101 - ELETRO", AV: "50,14%", "12x Cartao": "52,71%", "12x Carteira": "60,02%" },
  { Linha: "102 - VIDEO", AV: "48,81%", "12x Cartao": "51,46%", "12x Carteira": "58,85%" },
  { Linha: "103 - MOVEIS", AV: "66,11%", "12x Cartao": "67,86%", "12x Carteira": "74,11%" },
  { Linha: "105 - INFORMATICA", AV: "44,52%", "12x Cartao": "47,39%", "12x Carteira": "55,07%" },
  { Linha: "106 - TELECOM", AV: "42,98%", "12x Cartao": "45,92%", "12x Carteira": "53,71%" },
  { Linha: "107 - PORTATEIS", AV: "57,86%", "12x Cartao": "60,04%", "12x Carteira": "66,84%" },
  { Linha: "108 - LAZER", AV: "55,50%", "12x Cartao": "57,80%", "12x Carteira": "64,75%" },
  { Linha: "110 - UTIL. E PRESENTES", AV: "53,50%", "12x Cartao": "55,90%", "12x Carteira": "62,99%" },
  { Linha: "113 - BRINQUEDOS", AV: "54,84%", "12x Cartao": "57,17%", "12x Carteira": "64,17%" },
  { Linha: "123 - VENTILAÇÃO", AV: "55,04%", "12x Cartao": "57,36%", "12x Carteira": "64,34%" },
  { Linha: "124 - CLIMATIZAÇÃO", AV: "44,62%", "12x Cartao": "47,48%", "12x Carteira": "55,16%" },
  { Linha: "125 - AUDIO", AV: "54,67%", "12x Cartao": "57,01%", "12x Carteira": "64,02%" },
  { Linha: "201 - COLCHOES GAZIN", AV: "66,01%", "12x Cartao": "67,76%", "12x Carteira": "74,02%" },
  { Linha: "210 - ESTOFADOS GAZIN", AV: "66,04%", "12x Cartao": "67,79%", "12x Carteira": "74,05%" },
  { Linha: "908 - AUTOMOTIVO", AV: "24,11%", "12x Cartao": "28,03%", "12x Carteira": "37,06%" },
];

// Dados de rentabilidade para Mato Grosso (MT)
const mtTableData: Rentability[] = [
  { Linha: "101 - ELETRO", AV: "32,09%", "12x Cartao": "35,60%", "12x Carteira": "40,11%" },
  { Linha: "102 - VÍDEO", AV: "27,50%", "12x Cartao": "31,10%", "12x Carteira": "36,00%" },
  { Linha: "103 - MÓVEIS", AV: "63,80%", "12x Cartao": "65,67%", "12x Carteira": "68,07%" },
  { Linha: "105 - INFORMÁTICA", AV: "25,44%", "12x Cartao": "29,28%", "12x Carteira": "34,23%" },
  { Linha: "106 - TELECOM", AV: "22,93%", "12x Cartao": "26,91%", "12x Carteira": "33,00%" },
  { Linha: "107 - PORTÁTEIS", AV: "35,49%", "12x Cartao": "38,82%", "12x Carteira": "43,10%" },
  { Linha: "108 - LAZER", AV: "49,35%", "12x Cartao": "51,97%", "12x Carteira": "57,00%" },
  { Linha: "110 - UTIL. E PRESENTES", AV: "43,50%", "12x Cartao": "46,41%", "12x Carteira": "52,00%" },
  { Linha: "113 - BRINQUEDOS", AV: "54,18%", "12x Cartao": "56,55%", "12x Carteira": "59,59%" },
  { Linha: "123 - VENTILAÇÃO", AV: "35,38%", "12x Cartao": "38,71%", "12x Carteira": "43,00%" },
  { Linha: "124 - CLIMATIZAÇÃO", AV: "31,00%", "12x Cartao": "35,00%", "12x Carteira": "42,76%" },
  { Linha: "125 - ÁUDIO", AV: "31,97%", "12x Cartao": "35,48%", "12x Carteira": "39,00%" },
  { Linha: "129 - FERRAMENTAS", AV: "44,50%", "12x Cartao": "47,50%", "12x Carteira": "50,50%" },
  { Linha: "131 - IMPORTAÇÃO", AV: "44,00%", "12x Cartao": "47,50%", "12x Carteira": "52,00%" },
  { Linha: "132 - MOBILIDADE ELÉTRICA", AV: "33,50%", "12x Cartao": "36,50%", "12x Carteira": "40,00%" },
  { Linha: "210 - COLCHÕES", AV: "63,84%", "12x Cartao": "65,71%", "12x Carteira": "68,11%" },
  { Linha: "210 - ESTOFADO GAZIN", AV: "63,72%", "12x Cartao": "65,69%", "12x Carteira": "68,00%" },
  { Linha: "908 - AUTOMOTIVO", AV: "25,00%", "12x Cartao": "25,00%", "12x Carteira": "33,14%" },
];

const Calculator = () => {
  const [isPercentMode, setIsPercentMode] = useState(false);
  const [costPrice, setCostPrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [percentage, setPercentage] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [tableData, setTableData] = useState<Rentability[]>(acTableData); // Padrão para AC
  const [isTableOpen, setIsTableOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [result, setResult] = useState<string>("0");
  const isMobile = useIsMobile();

  useEffect(() => {
    document.documentElement.classList.remove("dark");
    setIsDarkMode(false);
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle("dark");
  };

  const calculateResult = () => {
    const cleanedCostPrice = costPrice.trim().replace("R$ ", "");
    const cleanedSalePrice = salePrice.trim().replace("R$ ", "");
    const numericCostPrice = cleanedCostPrice ? parseFloat(cleanedCostPrice.replace(",", ".")) : 0;
    const numericSalePrice = cleanedSalePrice ? parseFloat(cleanedSalePrice.replace(",", ".")) : 0;
    const numericPercentage = percentage ? parseFloat(percentage) : 0;

    if (isNaN(numericCostPrice) || numericCostPrice <= 0) {
      return "0";
    }

    try {
      if (isPercentMode) {
        if (isNaN(numericPercentage) || numericPercentage <= 0) {
          return "0,00";
        }
        const salePriceResult = calculateSalePrice(numericCostPrice, numericPercentage);
        return Number(salePriceResult).toFixed(2).replace(".", ",");
      } else {
        if (!cleanedSalePrice || isNaN(numericSalePrice) || numericSalePrice <= 0) {
          return "0";
        }
        const profitResult = calculateProfitPercentage(numericCostPrice, numericSalePrice);
        return Number(profitResult).toFixed(2);
      }
    } catch (error) {
      console.error("Erro no cálculo:", error);
      return "0";
    }
  };

  useEffect(() => {
    const newResult = calculateResult() || "0";
    setResult(newResult);
  }, [costPrice, salePrice, percentage, isPercentMode]);

  const handleAcClick = () => {
    setTableData(acTableData);
    setIsTableOpen(true);
  };

  const handleRoClick = () => {
    setTableData(roTableData);
    setIsTableOpen(true);
  };

  const handleMtClick = () => {
    setTableData(mtTableData);
    setIsTableOpen(true);
  };

  const numericResult = parseFloat((result || "0").replace(",", "."));
  const numericPercentage = percentage ? parseFloat(percentage) : 0;
  const profitPercentage = isPercentMode ? numericPercentage : numericResult;

  const resultClass = profitPercentage <= 45
    ? "text-red-600 bg-red-100 backdrop-blur-sm"
    : profitPercentage >= 46
    ? "text-green-600 bg-green-100 backdrop-blur-sm"
    : "text-gray-600 bg-gray-100";

  // Função normalizeString incluída diretamente, caso não esteja em @/lib/utils
  const normalizeString = (str: string) => {
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase();
  };

  return (
    <div className={cn("min-h-screen flex flex-col items-center justify-center p-4", isMobile ? "px-1" : "px-4")}>
      <Button
        variant="ghost"
        size="icon"
        className={cn("fixed top-4 right-4", isMobile ? "top-2 right-2" : "")}
        onClick={toggleDarkMode}
      >
        {isDarkMode ? (
          <Sun className={cn("h-8 w-8 md:h-6 md:w-6 text-primary", isMobile ? "h-6 w-6" : "")} />
        ) : (
          <Moon className={cn("h-8 w-8 md:h-6 md:w-6 text-primary", isMobile ? "h-6 w-6" : "")} />
        )}
      </Button>

      <Card className={cn("w-full max-w-md p-6 space-y-4", isMobile ? "rounded-none p-2" : "rounded-lg")}>
        <div className={cn("flex flex-col items-center space-y-4", isMobile ? "space-y-2" : "")}>
          <div className={cn("flex items-center gap-2", isMobile ? "flex-col items-center gap-1" : "")}>
            <CalculatorIcon
              className={cn("h-8 w-8 md:h-6 md:w-6 text-primary", isMobile ? "h-6 w-6" : "")}
              strokeWidth={isMobile ? 2 : 2}
            />
            <h1 className={cn("text-2xl font-semibold", isMobile ? "text-xl" : "")}>Calc Rentabilidade</h1>
          </div>

          <div className={cn("flex items-center", isMobile ? "flex-col w-full space-y-2" : "space-x-2")}>
            <Label htmlFor="mode" className={cn(isMobile ? "w-full text-center text-sm" : "text-sm")}>
              Calcular em {isPercentMode ? "Percentual" : "Valor"}
            </Label>
            <Switch
              id="mode"
              checked={isPercentMode}
              onCheckedChange={setIsPercentMode}
              className={cn(isMobile ? "w-16 h-8" : "w-12 h-6")}
            />
          </div>

          <div className={cn("w-full space-y-4", isMobile ? "space-y-2" : "")}>
            <div className={cn("flex flex-col-reverse items-center gap-2", isMobile ? "flex-col-reverse gap-1" : "flex-row justify-between")}>
              <Label htmlFor="costPrice" className={cn(isMobile ? "w-full text-left text-sm" : "text-sm")}>Preço de Custo</Label>
              <div className={cn("flex justify-end gap-2", isMobile ? "w-full flex-row" : "w-1/2")}>
                <Button variant="outline" className={cn(isMobile ? "w-1/3 text-sm p-1" : "w-1/3 text-sm px-2")} onClick={handleAcClick}>
                  <TableIcon className={cn("h-4 w-4 mr-1", isMobile ? "h-3 w-3" : "")} /> AC
                </Button>
                <Button variant="outline" className={cn(isMobile ? "w-1/3 text-sm p-1" : "w-1/3 text-sm px-2")} onClick={handleRoClick}>
                  <TableIcon className={cn("h-4 w-4 mr-1", isMobile ? "h-3 w-3" : "")} /> RO
                </Button>
                <Button variant="outline" className={cn(isMobile ? "w-1/3 text-sm p-1" : "w-1/3 text-sm px-2")} onClick={handleMtClick}>
                  <TableIcon className={cn("h-4 w-4 mr-1", isMobile ? "h-3 w-3" : "")} /> MT
                </Button>
              </div>
            </div>
            <Input
              id="costPrice"
              type="text"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
              placeholder="0,00"
              className={cn(isMobile ? "w-full text-sm p-2" : "")}
            />

            {isPercentMode ? (
              <div className={isMobile ? "w-full" : ""}>
                <Label htmlFor="percentage" className={isMobile ? "text-sm" : ""}>Percentual</Label>
                <Input
                  id="percentage"
                  type="number"
                  value={percentage}
                  onChange={(e) => setPercentage(e.target.value)}
                  placeholder="0"
                  className={cn(isMobile ? "w-full text-sm p-2" : "")}
                />
              </div>
            ) : (
              <div className={isMobile ? "w-full" : ""}>
                <Label htmlFor="salePrice" className={isMobile ? "text-sm" : ""}>Preço de Venda</Label>
                <Input
                  id="salePrice"
                  type="text"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  placeholder="0,00"
                  className={cn(isMobile ? "w-full text-sm p-2" : "")}
                />
              </div>
            )}

            <div className={cn("pt-4 w-full", isMobile ? "pt-2" : "")}>
              <Label className={isMobile ? "text-sm" : ""}>Resultado</Label>
              <div
                className={cn(
                  "text-2xl font-semibold text-center p-4 bg-secondary rounded-lg",
                  resultClass,
                  isMobile ? "text-xl p-2 w-full" : ""
                )}
              >
                {isPercentMode ? `R$ ${result || "0,00"}` : `${result || "0"}%`}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <footer className={cn("mt-8 text-center space-y-2", isMobile ? "w-full px-1" : "w-full px-4")}>
        <Dialog open={isInfoOpen} onOpenChange={setIsInfoOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className={cn("mt-2", isMobile ? "p-1" : "")}>
              <Info className={cn("h-5 w-5 text-primary", isMobile ? "h-4 w-4" : "")} />
            </Button>
          </DialogTrigger>
          <DialogContent className={cn("max-w-sm", isMobile ? "max-w-full p-2" : "")}>
            <DialogHeader>
              <DialogTitle className={isMobile ? "text-lg" : ""}>Informação</DialogTitle>
              <DialogDescription className={isMobile ? "text-sm" : ""}>
                Criado por: Renato Almeida (FL359)  
                Versão: 2.0.0
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
        <p className={cn("text-sm text-muted-foreground", isMobile ? "text-xs" : "")}>
          <a
            href="https://abre.ai/continad"
            target="_blank"
            rel="noopener noreferrer"
            className={cn("text-primary hover:underline", isMobile ? "text-xs" : "")}
          >
            App: Controle de Inadimplencia
          </a>
        </p>
      </footer>

      <Dialog open={isTableOpen} onOpenChange={setIsTableOpen}>
        <DialogContent className={cn("max-w-2xl max-h-[80vh] overflow-y-auto", isMobile ? "max-w-full p-2" : "")}>
          <DialogHeader>
            <DialogTitle className={isMobile ? "text-lg" : ""}>
              Tabela de Rentabilidade Permitida (Região {tableData === acTableData ? "AC" : tableData === roTableData ? "RO" : "MT"})
            </DialogTitle>
            <DialogDescription className={isMobile ? "text-sm" : ""}>
              Lista de percentuais autorizado por linha de produtos.
            </DialogDescription>
          </DialogHeader>
          <Table className={isMobile ? "text-sm" : ""}>
            <TableCaption className={isMobile ? "text-xs" : ""}>Legenda: AV= À Vista | CT= Cartão | CR= Carteira</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className={isMobile ? "text-xs" : ""}>Linha</TableHead>
                <TableHead className={isMobile ? "text-xs" : ""}>AV</TableHead>
                <TableHead className={isMobile ? "text-xs" : ""}>12x Cartao</TableHead>
                <TableHead className={isMobile ? "text-xs" : ""}>12x Carteira</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableData.length > 0 ? (
                tableData.map((line, index) => (
                  <TableRow
                    key={index}
                    className={
                      tableData === acTableData
                        ? normalizeString(line.Linha) === "102 - VIDEO" || normalizeString(line.Linha) === "125 - AUDIO"
                          ? "bg-yellow-200"
                          : normalizeString(line.Linha) === "105 - INFORMATICA"
                          ? "bg-green-200"
                          : ""
                        : tableData === mtTableData
                        ? normalizeString(line.Linha) === "106 - TELECOM" ||
                          normalizeString(line.Linha) === "108 - LAZER" ||
                          normalizeString(line.Linha) === "110 - UTIL. E PRESENTES" ||
                          normalizeString(line.Linha) === "125 - AUDIO"
                          ? "bg-blue-200"
                          : ""
                        : ""
                    }
                  >
                    <TableCell className={isMobile ? "text-xs" : ""}>{line.Linha}</TableCell>
                    <TableCell className={isMobile ? "text-xs" : ""}>{line.AV}</TableCell>
                    <TableCell className={isMobile ? "text-xs" : ""}>{line["12x Cartao"]}</TableCell>
                    <TableCell className={isMobile ? "text-xs" : ""}>{line["12x Carteira"]}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className={cn("text-center", isMobile ? "text-xs" : "")}>
                    Nenhum dado disponível
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Calculator;
