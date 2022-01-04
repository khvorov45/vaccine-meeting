library(tidyverse)

gisaid_meta_virus <- read_csv("data-raw/gisaid-meta-virus.csv", guess_max = 1e5, col_types = cols())

data <- read_csv("data/data.csv", col_types = cols())

data_viruses <- sort(unique(data$virus))

data_viruses_gisaid_meta <- map_dfr(
  data_viruses,
  function(data_virus_name) {
    data_virus_name_processed <- str_replace(tolower(data_virus_name), "e$", "")
    gisaid_meta_virus %>%
      filter(str_detect(tolower(virus_name), data_virus_name_processed)) %>%
      mutate(search_og = data_virus_name, search_processed = data_virus_name_processed)
  }
)

setdiff(data_viruses, data_viruses_gisaid_meta$search_og)

# NOTE(sen) Reference for passage annotations https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6599686/
data_viruses_gisaid_meta_extra <- data_viruses_gisaid_meta %>%
  mutate(
    passage_egg = str_detect(tolower(passage), "e\\d") | passage %in% c("EX"),
    passage_cell = !passage_egg &
      (str_detect(tolower(passage), "c|s|x\\d") |
        str_detect(tolower(passage), "mdck") |
        str_detect(tolower(passage), "siat") |
        str_detect(tolower(passage), "hck") |
        tolower(passage) %in% c("clinical specimen", "original", "original specimen", "original sample", "cs"))
  )

# NOTE(sen) Should be empty
data_viruses_gisaid_meta_extra %>%
  filter((!passage_egg & !passage_cell) | (passage_egg & passage_cell)) %>%
  pull(passage) %>%
  unique() %>%
  sort()

data_viruses_gisaid_meta_filtered <- data_viruses_gisaid_meta_extra %>%
  select(-subtype) %>%
  inner_join(data %>% select(virus, subtype, egg_cell) %>% distinct(), c("search_og" = "virus")) %>%
  group_by(search_og) %>%
  filter(n() == 1 | (egg_cell == "Cell" & passage_cell) | (egg_cell == "Egg" & passage_egg)) %>%
  select(virus_id, virus = search_og, subtype, egg_cell) %>%
  filter(row_number() == 1) %>%
  ungroup()

setdiff(data$virus, data_viruses_gisaid_meta_filtered$virus)

meta_virus_us_2021 <- gisaid_meta_virus %>%
  filter(
    host == "Human",
    str_sub(collection_date, 1, 4) == "2021",
    str_detect(location, "United States") | str_detect(location, "USA")
  )

unique(meta_virus_us_2021$subtype)
unique(meta_virus_us_2021$location)
unique(meta_virus_us_2021$collection_date)

viruses_for_clade_id <- unique(c(data_viruses_gisaid_meta_filtered$virus_id, meta_virus_us_2021$virus_id))

read_fasta_as_table <- function(filename) {
  fasta_string <- read_file(filename)
  fasta_string_split <- str_split(fasta_string, ">")[[1]] %>% `[`(. != "")
  fasta_string_meta_seq_split <- str_split(fasta_string_split, "\r\n|\n", n = 2)
  fasta_string_meta_seq_split_only2 <- fasta_string_meta_seq_split %>% `[`(map_lgl(., ~ length(.x) == 2))
  fasta_table <- tibble(
    meta_og = fasta_string_meta_seq_split_only2 %>% map_chr(~ .x[[1]]),
    seq_og = fasta_string_meta_seq_split_only2 %>% map_chr(~ .x[[2]]),
  )
}

# NOTE(sen) Split with seqkit
nuc_seq <- map_dfr(list.files("data-raw/gisaid-nuc-combined.fasta.split", full.names = TRUE), read_fasta_as_table)

nuc_extra <- nuc_seq %>%
  mutate(
    meta_split = str_split(meta_og, "\\|"),
    virus_id = map_chr(meta_split, ~ .x[[1]]),
    gene_name = map_chr(meta_split, ~ .x[[2]]),
  )

nuc_for_clade_id <- nuc_extra %>%
  filter(gene_name == "HA", virus_id %in% viruses_for_clade_id) %>%
  inner_join(gisaid_meta_virus, "virus_id") %>%
  select(meta_og, seq_og, subtype)

write_fasta <- function(meta_og, seq_og, filename) {
  headers <- paste0(">", meta_og, "\n")
  strings <- paste0(headers, seq_og)
  write(paste(strings, collapse = ""), filename)
}

with(nuc_for_clade_id %>% filter(subtype == "A / H3N2"), {
  write_fasta(
    meta_og, seq_og,
    paste0("data/seq-nuc-for-clade-id-h3.fasta")
  )
})

with(nuc_for_clade_id %>% filter(subtype == "A / H1N1"), {
  write_fasta(
    meta_og, seq_og,
    paste0("data/seq-nuc-for-clade-id-h1.fasta")
  )
})

with(nuc_for_clade_id %>% filter(subtype == "B"), {
  write_fasta(
    meta_og, seq_og,
    paste0("data/seq-nuc-for-clade-id-bvic.fasta")
  )
})

# NOTE(sen) Need to run assing_clades.py to get the actual clades

clades <- map_dfr(
  list.files("data", "clades-.*.tsv", full.names = TRUE),
  read_tsv,
  col_types = cols(), col_names = c("meta_og", "clades")
)

clades_extra <- clades %>%
  mutate(
    meta_split = str_split(meta_og, "\\|"),
    virus_id = map_chr(meta_split, 1),
    clades_split = str_split(clades, ","),
    clade = map_chr(clades_split, last) %>% str_trim(),
  ) %>%
  inner_join(gisaid_meta_virus, "virus_id")

clades_needed <- clades_extra %>%
  select(virus_id, clade)

data_viruses <- data_viruses_gisaid_meta_filtered %>%
  left_join(clades_needed, "virus_id")

unique(data_viruses$clade)

write_csv(data_viruses %>% select(virus, gisaid_id = virus_id, clade), "data/data-viruses-clades.csv")

us_2021_viruses <- meta_virus_us_2021 %>%
  select(virus_id, virus = virus_name, collection_date, location, gisaid_subtype = subtype, lineage, passage) %>%
  filter(passage == "Original") %>%
  mutate(
    collection_date = lubridate::as_date(collection_date),
    collection_year = lubridate::year(collection_date),
    collection_month = lubridate::month(collection_date),
    subtype = paste0(gisaid_subtype, if_else(is.na(lineage), "", lineage)) %>%
      recode("A / H1N1pdm09" = "H1", "A / H1N1" = "H1", "BVictoria" = "BVic", "A / H3N2" = "H3")
  ) %>%
  left_join(clades_needed, "virus_id")

unique(us_2021_viruses$subtype)
unique(us_2021_viruses$passage)
unique(us_2021_viruses$clade)

write_csv(
  us_2021_viruses %>% select(virus, gisaid_id = virus_id, contains("collection"), location, subtype, clade),
  "data/circulating-viruses.csv"
)
