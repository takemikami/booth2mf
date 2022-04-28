import * as React from 'react';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { DataGrid, GridToolbarContainer, GridToolbarExport} from '@mui/x-data-grid';
import TextField from '@mui/material/TextField';
import Grid from '@mui/material/Grid';
import Select, { SelectChangeEvent }  from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import InputLabel from '@mui/material/InputLabel';
import FormHelperText from '@mui/material/FormHelperText';
import FormControl from '@mui/material/FormControl';
import { usePapaParse } from 'react-papaparse';

// local storage hook
// see. https://www.robinwieruch.de/local-storage-react/
const useLocalStorage = (storageKey: string, initialState: any) => {
    const getState = () => {
        const storageValue: string | null = localStorage.getItem(storageKey)
        if (storageValue != null ) {
            try {
                return JSON.parse(storageValue)
            } catch(ex) {
                console.log(ex)
            }
        }
        return initialState
    }
    const [value, setValue] = React.useState(getState);
    React.useEffect(() => {
        localStorage.setItem(storageKey, JSON.stringify(value));
    }, [value, storageKey]);
    return [value, setValue];
};

const columns = [
    // { field: 'id', headerName: 'ID', sortable: false, width: 100 },
    { field: 'no', headerName: '取引No', sortable: false, width: 80 },
    { field: 'dt', headerName: '取引日', sortable: false, width: 100 },
    { field: 'dr_sbj1', headerName: '借方勘定科目', sortable: false, width: 100 },
    { field: 'dr_sbj2', headerName: '借方補助科目', sortable: false, width: 100 },
    { field: 'dr_taxg', headerName: '借方税区分', sortable: false, width: 100 },
    { field: 'dr_dept', headerName: '借方部門', sortable: false, width: 100 },
    { field: 'dr_amount', headerName: '借方金額(円)', sortable: false, width: 100 },
    { field: 'dr_tax', headerName: '借方税額', sortable: false, width: 100 },
    { field: 'cr_sbj1', headerName: '貸方勘定科目', sortable: false, width: 100 },
    { field: 'cr_sbj2', headerName: '貸方補助科目', sortable: false, width: 100 },
    { field: 'cr_taxg', headerName: '貸方税区分', sortable: false, width: 100 },
    { field: 'cr_dept', headerName: '貸方部門', sortable: false, width: 100 },
    { field: 'cr_amount', headerName: '貸方金額(円)', sortable: false, width: 100 },
    { field: 'cr_tax', headerName: '貸方税額', sortable: false, width: 100 },
    { field: 'remarks', headerName: '摘要', sortable: false, width: 100 },
    { field: 'note', headerName: '仕訳メモ', sortable: false, width: 100 },
    { field: 'tag', headerName: 'タグ', sortable: false, width: 100 },
    { field: 'type', headerName: 'MF仕訳タイプ', sortable: false, width: 100 },
    { field: 'adjust', headerName: '決算整理仕訳', sortable: false, width: 100 },
    { field: 'dt_create', headerName: '作成日時', sortable: false, width: 100 },
    { field: 'dt_update', headerName: '最終更新日時', sortable: false, width: 100 },
];

const transformCsv = (rawData: any, settings: { [key: string]: any; }) => {
    const data: Array<{ [key: string]: any; }> = rawData;
    var salesMap: { [key: string]: any; } = {};
    for (const row of data) {
        if(!row['注文番号']) {
            continue;
        }
        var rowSales = salesMap[row['注文番号']]
        if (rowSales == null) {
            rowSales = {
                no: row['注文番号'],
                dt: row['注文日時'].slice(0, 10),
                ts: Date.parse(row['注文日時']),
                recieved: parseInt(row['受取金額']),
                commission: parseInt(row['手数料']),
                amount: parseInt(row['小計'])
            }
        } else {
            rowSales['amount'] += parseInt(row['小計'])
        }
        salesMap[row['注文番号']] = rowSales
    }
    var salesList: Array<{ [key: string]: any; }> = [];
    for(var k in salesMap) {
        salesList.push(salesMap[k])
    }
    salesList.sort((a, b) => a['ts'] - b['ts']);
    var journals: Array<{ [key: string]: any; }> = [];
    var idx = 0;
    var idnum = 0;
    const nowDate = new Date()
    const now = nowDate.getFullYear() + '/'
        + `0${nowDate.getMonth()}`.slice(-2) + '/'
        + `0${nowDate.getDay()}`.slice(-2) + ' '
        + `0${nowDate.getHours()}`.slice(-2) + ':'
        + `0${nowDate.getMinutes()}`.slice(-2) + ':'
        + `0${nowDate.getSeconds()}`.slice(-2);
    for(var row of salesList) {
        idx++;
        idnum++;
        journals.push({
            id: idnum,
            no: idx,
            dt: row['dt'],
            dr_sbj1: '売掛金',
            dr_sbj2: settings['receivableSbj2'],
            dr_taxg: '対象外',
            dr_dept: '',
            dr_amount: row['recieved'],
            dr_tax: '',
            cr_sbj1: '売上高',
            cr_sbj2: settings['saleSbj2'],
            cr_taxg: settings['taxSales'],
            cr_dept: '',
            cr_amount: row['amount'],
            cr_tax: '',
            remarks: 'Booth注文番号: ' + row['no'],
            note: '',
            tag: '',
            type: '',
            adjust: '',
            dt_create: now,
            dt_update: now,
        })
        idnum++;
        journals.push({
            id: idnum,
            no: idx,
            dt: row['dt'],
            dr_sbj1: '支払手数料',
            dr_sbj2: '',
            dr_taxg: settings['taxCommission'],
            dr_dept: '',
            dr_amount: row['commission'] * -1,
            dr_tax: '',
            cr_sbj1: '',
            cr_sbj2: '',
            cr_taxg: '',
            cr_dept: '',
            cr_amount: '',
            cr_tax: '',
            cr_remarks: '',
            cr_note: '',
            cr_tag: '',
            cr_type: '',
            cr_adjust: '',
            dt_create: now,
            dt_update: now,
        })
    }
    return journals;
}

function CustomToolbar() {
    return (
        <GridToolbarContainer>
            <GridToolbarExport
                printOptions={{ disableToolbarButton: true }}
                csvOptions={{
                    fileName: 'booth2mf',
                }}
            />
        </GridToolbarContainer>
    );
}

function BoothToMF() {
    // 消費税・勘定科目の設定
    const [taxSales, setTaxSales] =  useLocalStorage('tax-sales', '対象外');
    const [taxCommission, setTaxCommission] = useLocalStorage('tax-commission', '対象外');
    const [saleSbj2, setSaleSbj2] = useLocalStorage('sales-subject', '');
    const [receivableSbj2, setReceivableSbj2] = useLocalStorage('receivable-subject', '');
    const handleChangeTaxSales = (event: SelectChangeEvent) => {
        setTaxSales(event.target.value);
    };
    const handleChangeTaxCommission = (event: SelectChangeEvent) => {
        setTaxCommission(event.target.value);
    };
    const handleChangeSaleSbj2 = (event: any) => {
        console.log(event)
        setSaleSbj2(event.target.value);
    };
    const handleChangeReceivableSbj2 = (event: any) => {
        setReceivableSbj2(event.target.value);
    };

    // ファイルの指定
    const [fileOrigin, setFileOrigin] = React.useState<File>();
    const [fileOriginName, setFileOriginName] = React.useState('');
    const onChangeFileOrigin = (event: React.FormEvent) => {
        const files = (event.target as HTMLInputElement).files
        if (files) {
            setFileOrigin(files[0]);
            setFileOriginName(files[0]['name']);
        }
    };

    // データの生成
    const rows00 = [
        { id: 0, no: null, firstName: null, age: null }
    ]
    const [rows, setRows] = React.useState<Array<{ [key: string]: any; }>>(rows00);
    function handleSubmit() {
        if(fileOrigin) {
            console.log('origin: ', fileOriginName);
            const fileReader = new FileReader();
            fileReader.onload = (e2) => {
                if (e2 && e2.target && e2.target.result) {
                    const { readString } = usePapaParse();
                    readString(e2.target.result.toString(), {
                        worker: true,
                        header: true,
                        complete: (results) => {
                            setRows(transformCsv(results['data'], {
                                taxSales: taxSales,
                                taxCommission: taxCommission,
                                saleSbj2: saleSbj2,
                                receivableSbj2: receivableSbj2,
                            }))
                        },
                    });
                }
            }
            fileReader.readAsText(fileOrigin);
        }
    }

    return (
        <div>
            <Box sx={{ my: 2 }}>
                <Typography>①消費税の設定</Typography>
                <Typography variant="caption" color="text.secondary">
                    売上・手数料に適用する消費税の区分を選択します（免税事業者は対象外を選択）
                </Typography>
                <Grid container spacing={3}>
                    <Grid item xs={3}>
                        <FormControl sx={{ my: 2 }}>
                            <InputLabel id="tax-sales-select-autowidth-label">税区分(売上)</InputLabel>
                            <Select
                                labelId="tax-sales-select-autowidth-label"
                                id="tax-sales"
                                value={taxSales}
                                onChange={handleChangeTaxSales}
                                label="税区分(売上)"
                            >
                                <MenuItem value="対象外">対象外</MenuItem>
                                <MenuItem value="課売 10%">課売 10%</MenuItem>
                                <MenuItem value="課売 10% 一種">課売 10% 一種</MenuItem>
                                <MenuItem value="課売 10% 二種">課売 10% 二種</MenuItem>
                                <MenuItem value="課売 10% 三種">課売 10% 三種</MenuItem>
                                <MenuItem value="課売 10% 四種">課売 10% 四種</MenuItem>
                                <MenuItem value="課売 10% 五種">課売 10% 五種</MenuItem>
                                <MenuItem value="課売 10% 六種">課売 10% 六種</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={9}>
                        <FormControl sx={{ my: 2 }}>
                            <InputLabel id="tax-commission-select-autowidth-label">税区分(手数料)</InputLabel>
                            <Select
                                labelId="tax-commission-select-autowidth-label"
                                id="tax-commission"
                                value={taxCommission}
                                onChange={handleChangeTaxCommission}
                                label="税区分(手数料)"
                            >
                                <MenuItem value="対象外">対象外</MenuItem>
                                <MenuItem value="課仕 10%">課仕 10%</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>
            </Box>

            <Box sx={{ my: 2 }}>
                <Typography>②補助科目の設定</Typography>
                <Typography variant="caption" color="text.secondary">
                    Booth取引の売上高・売掛金に指定する補助科目名を指定します（不要な場合は空欄のまま）
                </Typography>
                <Grid container spacing={3}>
                    <Grid item xs={3} sx={{ my: 2 }}>
                        <TextField id="sales-sbj2" label="売上高の補助科目" value={saleSbj2} onChange={handleChangeSaleSbj2}/>
                    </Grid>
                    <Grid item xs={9} sx={{ my: 2 }}>
                        <TextField id="receivable-sbj2" label="売掛金の補助科目" value={receivableSbj2} onChange={handleChangeReceivableSbj2} />
                    </Grid>
                </Grid>
            </Box>

            <Box sx={{ my: 2 }}>
                <Typography>③売上ファイルの指定</Typography>
                <Typography variant="caption" color="text.secondary">
                    Boothからダウンロードした「売上管理CSV」を指定します、ダウンロードは <a href="https://manage.booth.pm/sales/csv_requests" target="_blank">売上管理CSV一覧 | Booth</a> から
                </Typography>
                <Grid container spacing={3}>
                    <Grid item xs={3} sx={{ my: 2 }}>
                        <Button
                            component="label"
                            variant="outlined"
                        >
                            売上管理CSVの選択
                            <input
                                type="file"
                                accept="text/csv"
                                hidden
                                onChange={onChangeFileOrigin}
                            />
                        </Button>
                    </Grid>
                    <Grid item xs={9} sx={{ my: 2 }}>
                        <TextField
                            id="standard3-basic"
                            label="売上管理CSV"
                            value={fileOriginName}
                            variant="filled"
                            InputProps={{
                                readOnly: true,
                            }}
                        />
                    </Grid>
                </Grid>
            </Box>

            <Box sx={{ my: 2 }}>
                <Typography>④インポートデータの作成</Typography>
                <Typography variant="caption" color="text.secondary">
                    MoneyForwardの仕訳帳のインポートファイルを作成します、下の表にデータが表示されたらEXPORTからCSVを出力します
                </Typography>
                <Grid container spacing={3}>
                    <Grid item xs={12} sx={{ my: 2 }}>
                        <Button variant="outlined" onClick={handleSubmit}>仕訳インポートデータ作成</Button>
                    </Grid>
                </Grid>
            </Box>

            <Box sx={{ my: 4 }}>
                <div style={{ height: 400, width: '100%' }}>
                    <DataGrid
                        rows={rows}
                        columns={columns}
                        disableSelectionOnClick
                        components={{
                            Toolbar: CustomToolbar,
                        }}
                    />
                </div>
            </Box>

            <Box sx={{ my: 2 }}>
                <Typography>⑤MoneyForwardへのインポート</Typography>
                <Typography variant="caption" color="text.secondary">
                    MoneyForward会計で、左側メニュー:会計帳簿 → 仕訳帳 → 検索フォーム下ボタン:インポート → 仕訳帳と選び「仕訳帳(CSVファイル)のインポート」で、 ④で出力したファイルを指定してインポートします。
                </Typography>
            </Box>

        </div>
    )
}

function Copyright() {
    return (
        <div>
            <Typography variant="body2" color="text.secondary" align="center">
                {'Copyright © Takeshi Mikami. All rights reserved.'}
            </Typography>
        </div>
    );
}

export default function App() {
    return (
        <Container maxWidth="md">
            <div style={{position: 'absolute', top: '0px', right: '0px'}}>
            <a href="https://github.com/takemikami/booth2mf">
                <img loading="lazy" width="149" height="149"
                     src="https://github.blog/wp-content/uploads/2008/12/forkme_right_red_aa0000.png?resize=149%2C149"
                     className="attachment-full size-full" alt="Fork me on GitHub"
                     data-recalc-dims="1"/>
            </a>
            </div>
            <Box sx={{ my: 4 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Booth売上管理CSV → MoneyForward仕訳CSV
                </Typography>
                <Typography sx={{ mt: 6, mb: 3 }} color="text.secondary">
                    「Booth売上管理CSV」から「MoneyForward仕訳インポートCSV」を作成するツールです。<br/>
                    ※本ツールに関して、作者・著作権者および関連組織はなんら責任を負いません。自己責任でご利用ください。免税事業者・簡易課税制度を選択している事業者のみ利用可能です。
                </Typography>
                <BoothToMF />
                <Copyright />
            </Box>
        </Container>
    );
}
