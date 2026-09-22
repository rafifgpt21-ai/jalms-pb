export function numberToIndonesianText(num: number): string {
    const units = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];

    if (num < 12) {
        return units[num];
    } else if (num < 20) {
        return numberToIndonesianText(num - 10) + " Belas";
    } else if (num < 100) {
        return numberToIndonesianText(Math.floor(num / 10)) + " Puluh" + (num % 10 !== 0 ? " " + numberToIndonesianText(num % 10) : "");
    } else if (num < 200) {
        return "Seratus" + (num % 100 !== 0 ? " " + numberToIndonesianText(num % 100) : "");
    } else if (num < 1000) {
        return numberToIndonesianText(Math.floor(num / 100)) + " Ratus" + (num % 100 !== 0 ? " " + numberToIndonesianText(num % 100) : "");
    } else {
        return num.toString(); // Fallback for larger numbers if not needed
    }
}
