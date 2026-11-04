// Danh mục tài liệu tham khảo. Mọi DOI đã được đối chiếu qua bản ghi xuất bản
// (nhà xuất bản, Crossref, dblp hoặc PubMed Central) trước khi đưa vào.
// group: "classic" = công trình gốc; "recent" = nghiên cứu cập nhật; "data" = nguồn dữ liệu; "book" = giáo trình.
// rank: xếp hạng quý tham khảo theo SCImago (SJR); quý được xếp theo từng chuyên ngành và từng năm.
const REFS = [
  { key: "huffman1952", group: "classic",
    text: "D. A. Huffman, “A Method for the Construction of Minimum-Redundancy Codes,” Proceedings of the IRE, vol. 40, no. 9, pp. 1098–1101, 1952.",
    url: "https://doi.org/10.1109/JRPROC.1952.273898", doi: "10.1109/JRPROC.1952.273898" },
  { key: "gallager1978", group: "classic", rank: "Q1",
    text: "R. G. Gallager, “Variations on a Theme by Huffman,” IEEE Transactions on Information Theory, vol. 24, no. 6, pp. 668–674, 1978.",
    url: "https://doi.org/10.1109/TIT.1978.1055959", doi: "10.1109/TIT.1978.1055959" },
  { key: "knuth1985", group: "classic",
    text: "D. E. Knuth, “Dynamic Huffman Coding,” Journal of Algorithms, vol. 6, no. 2, pp. 163–180, 1985.",
    url: "https://doi.org/10.1016/0196-6774(85)90036-7", doi: "10.1016/0196-6774(85)90036-7" },
  { key: "vitter1987", group: "classic", rank: "Q1",
    text: "J. S. Vitter, “Design and Analysis of Dynamic Huffman Codes,” Journal of the ACM, vol. 34, no. 4, pp. 825–845, 1987.",
    url: "https://doi.org/10.1145/31846.42227", doi: "10.1145/31846.42227" },
  { key: "lz77", group: "classic", rank: "Q1",
    text: "J. Ziv, A. Lempel, “A Universal Algorithm for Sequential Data Compression,” IEEE Transactions on Information Theory, vol. 23, no. 3, pp. 337–343, 1977.",
    url: "https://doi.org/10.1109/TIT.1977.1055714", doi: "10.1109/TIT.1977.1055714" },
  { key: "lz78", group: "classic", rank: "Q1",
    text: "J. Ziv, A. Lempel, “Compression of Individual Sequences via Variable-Rate Coding,” IEEE Transactions on Information Theory, vol. 24, no. 5, pp. 530–536, 1978.",
    url: "https://doi.org/10.1109/TIT.1978.1055934", doi: "10.1109/TIT.1978.1055934" },
  { key: "lelewer1987", group: "classic", rank: "Q1",
    text: "D. A. Lelewer, D. S. Hirschberg, “Data Compression,” ACM Computing Surveys, vol. 19, no. 3, pp. 261–296, 1987.",
    url: "https://doi.org/10.1145/45072.45074", doi: "10.1145/45072.45074" },
  { key: "nasif2021", group: "recent", rank: "Q1–Q2",
    text: "A. Nasif, Z. A. Othman, N. S. Sani, “The Deep Learning Solutions on Lossless Compression Methods for Alleviating Data Load on IoT Nodes in Smart Cities,” Sensors, vol. 21, no. 12, art. 4223, 2021.",
    url: "https://www.mdpi.com/1424-8220/21/12/4223", doi: "10.3390/s21124223" },
  { key: "moffat2019", group: "recent", rank: "Q1",
    text: "A. Moffat, “Huffman Coding,” ACM Computing Surveys, vol. 52, no. 4, art. 85, pp. 1–35, 2019.",
    url: "https://doi.org/10.1145/3342555", doi: "10.1145/3342555" },
  { key: "blanchette2009", group: "recent", rank: "Q2",
    text: "J. C. Blanchette, “Proof Pearl: Mechanizing the Textbook Proof of Huffman’s Algorithm,” Journal of Automated Reasoning, vol. 43, pp. 1–18, 2009.",
    url: "https://doi.org/10.1007/s10817-009-9116-y", doi: "10.1007/s10817-009-9116-y" },
  { key: "chiarot2023", group: "recent", rank: "Q1",
    text: "G. Chiarot, C. Silvestri, “Time Series Compression Survey,” ACM Computing Surveys, vol. 55, no. 10, art. 198, 2023.",
    url: "https://doi.org/10.1145/3560814", doi: "10.1145/3560814" },
  { key: "srisooksai2012", group: "recent", rank: "Q1",
    text: "T. Srisooksai, K. Keamarungsi, P. Lamsrichan, K. Araki, “Practical Data Compression in Wireless Sensor Networks: A Survey,” Journal of Network and Computer Applications, vol. 35, no. 1, pp. 37–59, 2012.",
    url: "https://doi.org/10.1016/j.jnca.2011.03.001", doi: "10.1016/j.jnca.2011.03.001" },
  { key: "mishra2022", group: "recent", rank: "Q1–Q2",
    text: "M. Mishra, G. Sen Gupta, X. Gui, “Investigation of Energy Cost of Data Compression Algorithms in WSN for IoT Applications,” Sensors, vol. 22, no. 19, art. 7685, 2022.",
    url: "https://www.mdpi.com/1424-8220/22/19/7685", doi: "10.3390/s22197685" },
  { key: "hwang2023", group: "recent", rank: "Q1–Q2",
    text: "S.-H. Hwang, K.-M. Kim, S. Kim, J. W. Kwak, “Lossless Data Compression for Time-Series Sensor Data Based on Dynamic Bit Packing,” Sensors, vol. 23, no. 20, art. 8575, 2023.",
    url: "https://www.mdpi.com/1424-8220/23/20/8575", doi: "10.3390/s23208575" },
  { key: "nasif2024", group: "recent", rank: "Q1–Q2",
    text: "A. S. Nasif, Z. A. Othman, N. S. Sani, M. K. Hasan, Y. Abudaqqa, “Huffman Deep Compression of Edge Node Data for Reducing IoT Network Traffic,” IEEE Access, vol. 12, pp. 122988–122997, 2024.",
    url: "https://ieeexplore.ieee.org/document/10662892", doi: "10.1109/ACCESS.2024.3452669" },
  { key: "candanedo2016", group: "data", rank: "Q1",
    text: "L. M. Candanedo, V. Feldheim, “Accurate Occupancy Detection of an Office Room from Light, Temperature, Humidity and CO2 Measurements Using Statistical Learning Models,” Energy and Buildings, vol. 112, pp. 28–39, 2016.",
    url: "https://doi.org/10.1016/j.enbuild.2015.11.071", doi: "10.1016/j.enbuild.2015.11.071" },
  { key: "candanedo2017", group: "data", rank: "Q1",
    text: "L. M. Candanedo, V. Feldheim, D. Deramaix, “Data Driven Prediction Models of Energy Use of Appliances in a Low-Energy House,” Energy and Buildings, vol. 140, pp. 81–97, 2017.",
    url: "https://doi.org/10.1016/j.enbuild.2017.01.083", doi: "10.1016/j.enbuild.2017.01.083" },
  { key: "liang2015", group: "data",
    text: "X. Liang, T. Zou, B. Guo, S. Li, H. Zhang, S. Zhang, H. Huang, S. X. Chen, “Assessing Beijing’s PM2.5 Pollution: Severity, Weather Impact, APEC and Winter Heating,” Proceedings of the Royal Society A, vol. 471, no. 2182, art. 20150257, 2015.",
    url: "https://doi.org/10.1098/rspa.2015.0257", doi: "10.1098/rspa.2015.0257" },
  { key: "clrs", group: "book",
    text: "T. H. Cormen, C. E. Leiserson, R. L. Rivest, C. Stein, Introduction to Algorithms, 3rd ed., MIT Press, 2009, mục 16.3 “Huffman codes”.",
    url: null },
];

const INDEX = Object.fromEntries(REFS.map((r, i) => [r.key, i + 1]));

function cite(...keys) {
  return "[" + keys.map((k) => {
    if (!(k in INDEX)) throw new Error("Thiếu tài liệu tham khảo: " + k);
    return INDEX[k];
  }).join(", ") + "]";
}

module.exports = { REFS, cite, INDEX };
