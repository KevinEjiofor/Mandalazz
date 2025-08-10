class Month {
    static JANUARY = { number: 1, name: 'January', shortName: 'Jan' };
    static FEBRUARY = { number: 2, name: 'February', shortName: 'Feb' };
    static MARCH = { number: 3, name: 'March', shortName: 'Mar' };
    static APRIL = { number: 4, name: 'April', shortName: 'Apr' };
    static MAY = { number: 5, name: 'May', shortName: 'May' };
    static JUNE = { number: 6, name: 'June', shortName: 'Jun' };
    static JULY = { number: 7, name: 'July', shortName: 'Jul' };
    static AUGUST = { number: 8, name: 'August', shortName: 'Aug' };
    static SEPTEMBER = { number: 9, name: 'September', shortName: 'Sep' };
    static OCTOBER = { number: 10, name: 'October', shortName: 'Oct' };
    static NOVEMBER = { number: 11, name: 'November', shortName: 'Nov' };
    static DECEMBER = { number: 12, name: 'December', shortName: 'Dec' };

    static getAllMonths() {
        return [
            this.JANUARY, this.FEBRUARY, this.MARCH, this.APRIL,
            this.MAY, this.JUNE, this.JULY, this.AUGUST,
            this.SEPTEMBER, this.OCTOBER, this.NOVEMBER, this.DECEMBER
        ];
    }

    static getMonthByNumber(number) {
        const months = this.getAllMonths();
        return months.find(month => month.number === number);
    }

    static getMonthByName(name) {
        const normalizedName = name.toLowerCase().trim();
        const months = this.getAllMonths();

        return months.find(month =>
            month.name.toLowerCase() === normalizedName ||
            month.shortName.toLowerCase() === normalizedName
        );
    }

    static getMonthNames() {
        return this.getAllMonths().map(month => month.name);
    }

    static getMonthShortNames() {
        return this.getAllMonths().map(month => month.shortName);
    }

    static isValidMonthNumber(number) {
        const num = parseInt(number);
        return !isNaN(num) && num >= 1 && num <= 12;
    }

    static isValidMonthName(name) {
        return this.getMonthByName(name) !== undefined;
    }
}

module.exports = Month;