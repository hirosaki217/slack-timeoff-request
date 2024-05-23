/* eslint-disable no-console */
import { google } from 'googleapis'
import { JWT } from 'google-auth-library'
import { env } from './config'

const API_KEY = env.NEXT_PUBLIC_FIREBASE_API_KEY

type getSheetDataInput = {
  sheetId: string
  sheetName: string
}

type getPrivateSheetDataInput = {
  sheetId: string
  sheetName: string
  range: string
}

type appendSheetDataInput = {
  sheetId: string
  sheetName: string
  range: string
  data: (string | number | null)[][]
  valueInputOption?: string
}

/**
 * Hàm get thông tin từ sheet được chia sẻ public
 * Thông tin trả về  là raw data dạng string [] [] từ file google sheet
 *
 * @returns raw data was fetched from sheet
 */
export const getPublicSheetData = async ({
  sheetId,
  sheetName,
}: getSheetDataInput) => {
  return await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${sheetName}?key=${API_KEY}`
  )
    .then((response) => {
      if (!response.ok) {
        throw new Error(response.status + ' ' + response.statusText)
      }
      return response.json()
    })
    .then(
      (data) =>
        !!data.values &&
        data.values.length > 0 &&
        data.values.filter((item: Array<string>) => !!item[0]) // chỉ trả về  những hàng có data
    )
}

/**
 * Lấy ra data raw từ những sheet private
 */
export const getPrivateSheetData = async ({
  sheetId,
  sheetName,
  range,
}: getPrivateSheetDataInput) => {
  const client = await getAuthClient()
  const sheets = google.sheets({ version: 'v4', auth: client })

  const result = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: sheetName + range,
  })
  // console.log(result)
  return result.data.values
}

/**
 * Chèn thêm rows vào file google sheet thông qua 1 khoảng range
 * Lưu ý: range phải bắt đầu bằng dấu !
 *
 */
export const appendSheetData = async ({
  sheetId,
  sheetName,
  range,
  data,
  valueInputOption = 'RAW',
}: appendSheetDataInput) => {
  const client = await getAuthClient()

  const sheets = google.sheets({ version: 'v4', auth: client })
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: sheetName + range,
    valueInputOption: valueInputOption,
    requestBody: {
      values: data,
    },
  })
}

/**
 * Cho phép update lại giá trị đã có của cell trong sheet
 * Lưu ý: range phải bắt đầu bằng dấu !
 *
 */
export const insertSheetData = async ({
  sheetId,
  sheetName,
  range,
  data,
  valueInputOption = 'RAW',
}: appendSheetDataInput) => {
  const client = await getAuthClient()

  const sheets = google.sheets({ version: 'v4', auth: client })
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: sheetName + range,
    valueInputOption: valueInputOption,
    requestBody: {
      values: data,
    },
  })
}

export const getAuthClient = async () => {
  const client = new JWT({
    email: env.FIREBASE_ADMIN_SA_CLIENT_EMAIL!,
    key: env.FIREBASE_ADMIN_SA_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'], // có thể thêm scop cho gg doc,...
  })

  await client.authorize()

  return client
}
