import { Client } from "@notionhq/client";
import dotenv from "dotenv";

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

async function main() {
  const notion = new Client({
    auth: process.env.NOTION_TOKEN,
  });

  // const response = await notion.databases.query({
  //   database_id: "38444868ae0d44be85ad18484a8abcb1",
  // });

  const response = await notion.pages.create(
    new ExpenditureRow(
      process.env.DATABASE_ID as any,
      "2022-11-07",
      11800,
      "8efd9db0-b592-4bad-8555-e1bd82cc5096",
      "Q13 Maintainence"
    ) as any
  );

  console.log("Got response:", response);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
