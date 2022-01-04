library(tidyverse)

nextstrain_tree_h3 <- httr::GET(
  "https://nextstrain.org/charon/getDataset?prefix=/flu/seasonal/h3n2/ha/6m"
) %>%
  httr::content()

nextstrain_tree_h1 <- httr::GET(
  "https://nextstrain.org/charon/getDataset?prefix=/flu/seasonal/h1n1pdm/ha/6m"
) %>%
  httr::content()

nextstrain_tree_bvic <- httr::GET(
  "https://nextstrain.org/charon/getDataset?prefix=/flu/seasonal/vic/ha/6m"
) %>%
  httr::content()

process_child <- function(child) {
  children <- tibble()
  if (!is.null(child$children)) {
    children <- map_dfr(child$children, process_child)
  }
  bind_rows(
    tibble(
      name = child$name,
      clade = child$node_attrs$clade_membership$value,
      country = child$node_attrs$country$value,
      region = child$node_attrs$region$value
    ),
    children
  )
}

nextstrain_viruses_h3 <- map_dfr(nextstrain_tree_h3$tree$children, process_child) %>%
  filter(!str_starts(name, "NODE"))

nextstrain_viruses_h1 <- map_dfr(nextstrain_tree_h1$tree$children, process_child) %>%
  filter(!str_starts(name, "NODE"))

nextstrain_viruses_bvic <- map_dfr(nextstrain_tree_bvic$tree$children, process_child) %>%
  filter(!str_starts(name, "NODE"))

nextstrain_viruses <- bind_rows(
  nextstrain_viruses_h3 %>% mutate(subtype = "H3"),
  nextstrain_viruses_h1 %>% mutate(subtype = "H1"),
  nextstrain_viruses_bvic %>% mutate(subtype = "BVic"),
)

nextstain_freqs_h3 <- httr::GET(
  "https://nextstrain.org/charon/getDataset?prefix=/flu/seasonal/h3n2/ha/6m&type=tip-frequencies"
) %>%
  httr::content()

nextstain_freqs_h1 <- httr::GET(
  "https://nextstrain.org/charon/getDataset?prefix=/flu/seasonal/h1n1pdm/ha/6m&type=tip-frequencies"
) %>%
  httr::content()

nextstain_freqs_bvic <- httr::GET(
  "https://nextstrain.org/charon/getDataset?prefix=/flu/seasonal/vic/ha/6m&type=tip-frequencies"
) %>%
  httr::content()

process_freq <- function(freq, name, pivots) {
  if (name == "generated_by" | name == "pivots") {
    return(tibble())
  }
  imap_dfr(
    freq$frequencies,
    ~ tibble(name = name, n = .y, freq = .x, year = pivots[[.y]])
  )
}

nextstrain_freq_table_h3 <- imap_dfr(
  nextstain_freqs_h3, process_freq, nextstain_freqs_h3$pivots
)

nextstrain_freq_table_h1 <- imap_dfr(
  nextstain_freqs_h1, process_freq, nextstain_freqs_h1$pivots
)

nextstrain_freq_table_bvic <- imap_dfr(
  nextstain_freqs_bvic, process_freq, nextstain_freqs_bvic$pivots
)

setdiff(nextstrain_freq_table_h3$name, nextstrain_viruses_h3$name)
setdiff(nextstrain_freq_table_h1$name, nextstrain_viruses_h1$name)
setdiff(nextstrain_freq_table_bvic$name, nextstrain_viruses_bvic$name)

nextstrain_freq_table <- bind_rows(
  nextstrain_freq_table_h3 %>% mutate(subtype = "H3"),
  nextstrain_freq_table_h1 %>% mutate(subtype = "H1"),
  nextstrain_freq_table_bvic %>% mutate(subtype = "BVic"),
)

freq_table_extra <- nextstrain_freq_table %>%
  inner_join(nextstrain_viruses, c("name", "subtype"))

write_csv(freq_table_extra, "data-raw/nextstrain-virus-frequencies.csv")
