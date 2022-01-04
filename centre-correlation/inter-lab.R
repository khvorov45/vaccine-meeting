library(tidyverse)


titres <- readxl::read_excel(
  "2019SH-standards-correlations.xlsx",
  "Transformed Data", "A8:G26",
  na = "NA",
  .name_repair = tolower
) %>%
  pivot_longer(
    c(-antigen, -standard),
    names_to = "lab", values_to = "titre"
  ) %>%
  mutate(titre = 5 * 2^(titre - 1)) %>%
  filter(!is.na(titre))

pairwise_plot <- titres %>%
  pivot_wider(names_from = "lab", values_from = "titre") %>%
  GGally::ggpairs(
    columns = 3:length(.),
    lower = list(
      continuous = function(data, mapping, ...) {
        ggplot(data, mapping) +
          theme_bw() +
          theme(
            axis.text.x = element_text(angle = 90, hjust = 1),
            panel.grid.minor = element_blank(),
          ) +
          geom_point() +
          geom_abline(intercept = 0, slope = 1) +
          scale_x_log10(breaks = 5 * 2^(0:10)) +
          scale_y_log10(breaks = 5 * 2^(0:10)) +
          coord_cartesian(
            xlim = c(min(titres$titre), max(titres$titre)),
            ylim = c(min(titres$titre), max(titres$titre))
          )
      }
    ),
    diag = list(continuous = "blankDiag"),
    upper = list(continuous = "blank"),
    switch = "both",
    labeller = as_labeller(toupper)
  ) +
  theme(
    strip.placement = "outside",
    strip.background = element_blank()
  )

gpairs_lower <- function(g) {
  # Remove top row
  g$plots <- g$plots[-(1:g$nrow)]
  g$yAxisLabels <- g$yAxisLabels[-1]
  g$nrow <- g$nrow - 1
  # Remove right column
  g$plots <- g$plots[-(seq(g$ncol, length(g$plots), by = g$ncol))]
  g$xAxisLabels <- g$xAxisLabels[-g$ncol]
  g$ncol <- g$ncol - 1

  g
}

gpairs_lower(pairwise_plot)

ggsave("pairwise-plots.pdf", width = 20, height = 20, units = "cm")
