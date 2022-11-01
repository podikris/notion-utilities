import { Client } from "@notionhq/client";
import dotenv from "dotenv";
const fs = require("fs");
const { parse } = require("csv-parse");

dotenv.config();

class NotionDataType {
  type: string;

  constructor(type: string) {
    this.type = type;
  }
}

class NotionDate extends NotionDataType {
  date: {
    start: string;
    end: string | null;
    time_zone: string | null;
  };
  constructor(start: string, end = null, time_zone = null) {
    super("date");
    this.date = {
      start,
      end,
      time_zone,
    };
  }
}

class NotionNumber extends NotionDataType {
  number: number;

  constructor(number: number) {
    super("number");
    this.number = number;
  }
}

class NotionSelect extends NotionDataType {
  select: {
    id: string;
  };

  constructor(id: string) {
    super("select");
    this.select = {
      id,
    };
  }
}

class NotionText extends NotionDataType {
  plain_text: string;
  href: string | null;
  text: {
    content: string;
    link: string | null;
  };

  constructor(title: string) {
    super("text");
    this.plain_text = title;
    this.href = null;
    this.text = {
      content: title,
      link: null,
    };
  }
}

class NotionTitle extends NotionDataType {
  title: NotionText[];

  constructor(title: string) {
    super("title");
    this.title = [new NotionText(title)];
  }
}

class TransactionsTable {
  Date: NotionDate;
  Amount: NotionNumber;
  Mode: NotionSelect;
  Transact: NotionTitle;

  constructor(startDate: string, amount: number, mode: string, title: string) {
    this.Date = new NotionDate(startDate);
    this.Amount = new NotionNumber(amount);
    this.Mode = new NotionSelect(mode);
    this.Transact = new NotionTitle(title);
  }
}

class ExpenditureRow {
  parent: {
    database_id: string;
  };
  properties: TransactionsTable;

  constructor(
    database_id: string,
    date: string,
    amount: number,
    mode: string,
    title: string
  ) {
    this.parent = { database_id };
    this.properties = new TransactionsTable(date, amount, mode, title);
  }
}

const EXPENDITURE_MODE = {
  "HDFC UPI": "8efd9db0-b592-4bad-8555-e1bd82cc5096",
  "HDFC SB": "5a889dc5-126c-4b42-aaf9-ed98f73056fb",
  "HDFC DC": "5d7bcf76-d89b-42d3-a3b9-2697ef063e58",
};

interface IHDFCTransaction {
  Date: string;
  Narration: string;
  ValueDat: string;
  DebitAmount: number;
  CreditAmount: number;
  ChqRefNumber: string;
  ClosingBalance: string;
  Mode: string;
}

function readCSV(): Promise<IHDFCTransaction[]> {
  /*************** Read CSV ***************/
  const transactions = [] as any[];
  const isUPI = /^UPI/g;
  const isDebitCard = /^POS/g;

  return new Promise((resolve) => {
    fs.createReadStream("./transactions.csv")
      .pipe(
        parse({
          delimiter: ",",
          trim: true,
          columns: (header: string[]) => {
            console.log(header);

            const newHeader: string[] = [];
            header.map((column) => {
              newHeader.push(column.split(/[\s//]+/).join(""));
            });

            return newHeader;
          },
          from_line: 2,
          skip_empty_lines: true,
          cast: (value: any, context: any) => {
            if (context.header) return value;
            if (
              context.column === "DebitAmount" ||
              context.column === "CreditAmount"
            )
              return Number(value);
            if (context.column === "Date")
              return value.replace(/(\d\d)\/(\d\d)\/(\d\d)/, "20$3-$2-$1");

            return String(value);
          },
        })
      )
      .on("data", function (row: any) {
        if (row.Narration.match(isUPI)) row.Mode = "HDFC UPI";
        else if (row.Narration.match(isDebitCard)) row.Mode = "HDFC DC";
        else row.Mode = "HDFC SB";

        transactions.push(row);
      })
      .on("end", function () {
        console.log("Data loaded from CSV");
        resolve(transactions);
      })
      .on("error", function (error: any) {
        console.log(error.message);
        resolve([]);
      });
  });
}

async function main() {
  const notion = new Client({
    auth: process.env.NOTION_TOKEN,
  });

  /*************** Read Database ***************/
  // const response = await notion.databases.query({
  //   database_id: "38444868ae0d44be85ad18484a8abcb1",
  // });

  /*********** Insert row to database ***********/
  // const response = await notion.pages.create(
  //   new ExpenditureRow(
  //     process.env.DATABASE_ID as any,
  //     "2022-11-07",
  //     11800,
  //     "8efd9db0-b592-4bad-8555-e1bd82cc5096",
  //     "Q13 Maintainence"
  //   ) as any
  // );
  // console.log("Got response:", response);

  /*********** Insert row to database ***********/
  const transactions = await readCSV();
  await Promise.all(
    transactions.map((transaction: IHDFCTransaction) =>
      notion.pages.create(
        new ExpenditureRow(
          process.env.DATABASE_ID as any,
          transaction.Date,
          transaction.DebitAmount,
          EXPENDITURE_MODE[transaction.Mode as keyof typeof EXPENDITURE_MODE],
          transaction.Narration
        ) as any
      )
    )
  );

  console.log("Pushed all transactions");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
